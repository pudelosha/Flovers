"""Owner-scoped, filtered/keyset-paginated notification inbox."""
import hashlib
import json
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core import signing
from django.db.models import Max, Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import InboxNotification


class InboxQuery(serializers.Serializer):
    source = serializers.ChoiceField(choices=[x[0] for x in InboxNotification.SOURCES], required=False)
    channel = serializers.ChoiceField(choices=[x[0] for x in InboxNotification.CHANNELS], required=False)
    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)
    timezone = serializers.CharField(default="Europe/Warsaw", max_length=80)
    sort = serializers.ChoiceField(choices=["date", "source", "channel"], default="date")
    direction = serializers.ChoiceField(choices=["asc", "desc"], default="desc")
    cursor = serializers.CharField(required=False, max_length=2500)

    def validate(self, attrs):
        try:
            ZoneInfo(attrs["timezone"])
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError({"timezone": "Invalid timezone."})
        if attrs.get("from_date") and attrs.get("to_date") and attrs["from_date"] > attrs["to_date"]:
            raise serializers.ValidationError({"to_date": "End date precedes start date."})
        if attrs.get("to_date") and attrs["to_date"].year == 9999:
            raise serializers.ValidationError({"to_date": "Date is out of range."})
        return attrs


def validated(data):
    serializer = InboxQuery(data=data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def filtered(user, values):
    rows = InboxNotification.objects.filter(user=user, deleted_at__isnull=True)
    for key in ("source", "channel"):
        if values.get(key): rows = rows.filter(**{key: values[key]})
    zone = ZoneInfo(values["timezone"])
    if values.get("from_date"):
        rows = rows.filter(created_at__gte=datetime.combine(values["from_date"], time.min, zone))
    if values.get("to_date"):
        rows = rows.filter(created_at__lt=datetime.combine(values["to_date"]+timedelta(days=1), time.min, zone))
    return rows


def fingerprint(values):
    return hashlib.sha256(json.dumps({k:str(v) for k,v in values.items() if k!="cursor"},sort_keys=True).encode()).hexdigest()


def snapshot_token(user, maximum):
    return signing.dumps({"u":user.pk,"max":maximum},salt="inbox-delete",compress=True)


def decode(token, salt):
    try: return signing.loads(token,salt=salt,max_age=86400)
    except signing.BadSignature: raise ValidationError({"cursor":"Invalid or expired inbox snapshot."})


def result(data):
    return Response({"status":"success","data":data})


class InboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        values = validated(request.query_params)
        field = {"date":"created_at","source":"source","channel":"channel"}[values["sort"]]
        direction = values["direction"]
        digest = fingerprint(values)
        boundary = None
        if values.get("cursor"):
            boundary = decode(values["cursor"], "inbox-page")
            if boundary.get("u") != request.user.pk or boundary.get("f") != digest:
                raise ValidationError({"cursor":"Cursor does not match this inbox query."})
            maximum = boundary["max"]
        else:
            maximum = InboxNotification.objects.filter(user=request.user).aggregate(value=Max("pk"))["value"] or 0
        rows = filtered(request.user, values).filter(pk__lte=maximum)
        total = rows.count()
        if boundary:
            op = "gt" if direction=="asc" else "lt"
            value = boundary["value"]
            if field=="created_at": value=datetime.fromisoformat(value)
            rows=rows.filter(Q(**{field+"__"+op:value}) | Q(**{field:value,"pk__"+op:boundary["pk"]}))
        prefix = "" if direction=="asc" else "-"
        page=list(rows.order_by(prefix+field,prefix+"pk")[:31])
        next_cursor=None
        if len(page)>30:
            page=page[:30];last=page[-1];value=getattr(last,field)
            next_cursor=signing.dumps({"u":request.user.pk,"f":digest,"max":maximum,"pk":last.pk,
                "value":value.isoformat() if field=="created_at" else value},salt="inbox-page",compress=True)
        return result({"items":[{"id":str(x.pk),"source":x.source,"channel":x.channel,"kind":x.kind,
            "payload":x.payload,"created_at":x.created_at.isoformat()} for x in page],
            "next_cursor":next_cursor,"total":total,"snapshot":snapshot_token(request.user,maximum)})


class InboxDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self,request,pk):
        row=InboxNotification.objects.filter(user=request.user,pk=pk).first()
        if row is None: raise NotFound()
        count=InboxNotification.objects.filter(pk=row.pk,deleted_at__isnull=True).update(deleted_at=timezone.now())
        return result({"deleted":count})


class InboxBulkDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self,request):
        token=request.data.get("snapshot")
        if not isinstance(token,str) or len(token)>2500:
            raise ValidationError({"snapshot":"A current inbox snapshot is required."})
        boundary=decode(token,"inbox-delete")
        if boundary.get("u")!=request.user.pk: raise ValidationError({"snapshot":"Invalid inbox snapshot."})
        scope=request.data.get("scope","filtered")
        if scope not in ("all","filtered"): raise ValidationError({"scope":"Invalid deletion scope."})
        raw=request.data.get("filters",{})
        if not isinstance(raw,dict): raise ValidationError({"filters":"Invalid filters."})
        values=validated({} if scope=="all" else raw)
        count=filtered(request.user,values).filter(pk__lte=boundary["max"]).update(deleted_at=timezone.now())
        return result({"deleted":count})
