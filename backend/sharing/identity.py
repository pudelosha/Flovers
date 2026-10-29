"""Care attribution without exposing a caregiver's email to unrelated viewers."""
from django.db.models import Q

from contacts.models import Connection


def accepted_contact_aliases(viewer):
    aliases = {}
    rows = Connection.objects.filter(
        Q(user_low=viewer) | Q(user_high=viewer), status=Connection.Status.ACCEPTED,
    )
    for row in rows:
        low = row.user_low_id == viewer.pk
        aliases[row.user_high_id if low else row.user_low_id] = row.alias_low if low else row.alias_high
    return aliases


def care_actor_identity(actor, viewer=None, *, contact_aliases=None):
    if actor is None:
        return None
    public_name = actor.get_full_name().strip()
    name = public_name or f"FL-{actor.flovers_id.hex.upper()}"
    if viewer is not None and viewer.is_authenticated:
        if viewer.pk == actor.pk:
            name = public_name or actor.email or name
        else:
            aliases = contact_aliases if contact_aliases is not None else accepted_contact_aliases(viewer)
            if actor.pk in aliases:
                name = aliases[actor.pk] or public_name or actor.email or name
    return {"id": str(actor.pk), "name": name}
