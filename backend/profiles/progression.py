"""Account XP is awarded only by the server during a new care-task completion."""
from datetime import timezone as datetime_timezone

from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.db.models import OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import AccountProgression, TaskXPAward


DAILY_REWARDS = (100, 50, 30, 20, 10, 10, 10, 10, 10)
DAILY_CAP = sum(DAILY_REWARDS)
MAX_LEVEL = 100
RANK_KEYS = (
    "seedling", "sproutKeeper", "leafLover", "buddingGardener", "plantNurturer",
    "greenThumb", "gardenGuardian", "botanicalExpert", "masterGrower", "plantLegend",
)


def xp_for_next_level(level):
    if level >= MAX_LEVEL:
        return 0
    return 100 * level if level <= 10 else 1000 + 25 * (level - 10)


MAX_TOTAL_XP = sum(xp_for_next_level(level) for level in range(1, MAX_LEVEL))


def level_progress(total_xp):
    remaining = max(0, min(MAX_TOTAL_XP, int(total_xp)))
    level = 1
    while level < MAX_LEVEL and remaining >= xp_for_next_level(level):
        remaining -= xp_for_next_level(level)
        level += 1
    return {
        "level": level,
        "rank_key": RANK_KEYS[(level - 1) // 10],
        "xp_into_level": remaining if level < MAX_LEVEL else 0,
        "xp_for_next_level": xp_for_next_level(level),
    }


def get_progression(user):
    """Read one consistent balance/quota snapshot without creating any rows."""
    earned_on = timezone.now().astimezone(datetime_timezone.utc).date()
    daily_sum = TaskXPAward.objects.filter(
        user_id=OuterRef("user_id"), earned_on=earned_on,
    ).values("user_id").annotate(total=Sum("xp")).values("total")
    snapshot = AccountProgression.objects.filter(user_id=user.pk).annotate(
        daily_xp=Coalesce(Subquery(daily_sum, output_field=models.IntegerField()), Value(0)),
    ).values("total_xp", "daily_xp").first() or {"total_xp": 0, "daily_xp": 0}
    return {**snapshot, **level_progress(snapshot["total_xp"]), "daily_cap": DAILY_CAP}


@transaction.atomic
def award_task_completion(task, receipt_now):
    """Decide once per newly completed occurrence, atomically with completion.

    The caller already holds reminder/task locks. All award writers then lock
    user, followed by progression. Locking the always-existing user also makes
    first-completion balance creation safe across different reminders.
    """
    if task.status != "completed":
        raise ValueError("XP can only be decided for a completed care task.")
    get_user_model().objects.select_for_update().get(pk=task.user_id)
    previous = TaskXPAward.objects.filter(source_task_id=task.pk).first()
    if previous is not None:
        return previous

    progression, _ = AccountProgression.objects.get_or_create(user_id=task.user_id)
    progression = AccountProgression.objects.select_for_update().get(pk=progression.pk)
    earned_on = receipt_now.astimezone(datetime_timezone.utc).date()
    # Task dates use the server's configured care calendar. Request/profile
    # timezone changes and client-supplied completion dates cannot move it.
    due_today = timezone.localdate(receipt_now, timezone=timezone.get_default_timezone())
    today_awards = TaskXPAward.objects.filter(user_id=task.user_id, earned_on=earned_on)
    xp = 0
    if task.due_date > due_today:
        reason = TaskXPAward.REASON_EARLY
    elif progression.total_xp >= MAX_TOTAL_XP:
        reason = TaskXPAward.REASON_LEVEL_CAP
    elif today_awards.filter(
        plant_id=task.reminder.plant_id, care_type=task.reminder.type, xp__gt=0,
    ).exists():
        reason = TaskXPAward.REASON_PLANT_LIMIT
    else:
        summary = today_awards.aggregate(
            total=Sum("xp"), positive_count=models.Count("pk", filter=models.Q(xp__gt=0)),
        )
        ordinal = summary["positive_count"]
        reward = DAILY_REWARDS[ordinal] if ordinal < len(DAILY_REWARDS) else 0
        xp = min(reward, DAILY_CAP - (summary["total"] or 0), MAX_TOTAL_XP - progression.total_xp)
        reason = TaskXPAward.REASON_AWARDED if xp > 0 else TaskXPAward.REASON_DAILY_CAP

    award = TaskXPAward.objects.create(
        user_id=task.user_id, source_task_id=task.pk, plant_id=task.reminder.plant_id,
        care_type=task.reminder.type, earned_on=earned_on, xp=xp, reason=reason,
        created_at=receipt_now,
    )
    if xp:
        progression.total_xp += xp
        progression.save(update_fields=["total_xp", "updated_at"])
    return award
