from datetime import timedelta

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from plant_instances.tests.test_journal_feed import feed

pytestmark=pytest.mark.django_db


def detail(entry):
    return reverse("journal-photo-detail",kwargs={"entry_id":entry.pk})


def test_navigation_stays_with_one_plant_and_returns_only_nearest_neighbors(feed):
    older=feed.photo(when=feed.now-timedelta(days=2))
    middle=feed.photo(when=feed.now-timedelta(days=1))
    newer=feed.photo(when=feed.now)
    feed.photo(plant=feed.second,when=feed.now-timedelta(hours=12))
    response=feed.client.get(detail(middle),{"navigation":"1"})
    assert response.status_code==200,response.data
    assert response.data["navigation"]=={"previous_id":str(older.pk),"next_id":str(newer.pk)}
    assert feed.client.get(detail(older),{"navigation":"1"}).data["navigation"]=={"previous_id":None,"next_id":str(middle.pk)}
    assert feed.client.get(detail(newer),{"navigation":"1"}).data["navigation"]=={"previous_id":str(middle.pk),"next_id":None}
    assert "navigation" not in feed.client.get(detail(middle)).data


def test_single_photo_has_no_navigation_and_tied_timestamps_have_stable_order(feed):
    first=feed.photo()
    assert feed.client.get(detail(first),{"navigation":"1"}).data["navigation"]=={"previous_id":None,"next_id":None}
    photos=sorted([first,feed.photo(),feed.photo()],key=lambda photo:photo.pk)
    assert feed.client.get(detail(photos[1]),{"navigation":"1"}).data["navigation"]=={
        "previous_id":str(photos[0].pk),"next_id":str(photos[2].pk)}


def test_shared_preview_navigation_requires_current_access_and_never_exposes_other_plants(feed):
    older=feed.photo(when=feed.now-timedelta(days=1))
    photo=feed.photo()
    other=feed.photo(plant=feed.second)
    feed.client.force_authenticate(feed.reader)
    response=feed.client.get(detail(photo),{"navigation":"1"})
    assert response.status_code==200
    assert response.data["navigation"]=={"previous_id":str(older.pk),"next_id":None}
    assert feed.client.get(detail(other),{"navigation":"1"}).status_code==404
    feed.share.delete()
    assert feed.client.get(detail(older),{"navigation":"1"}).status_code==404
    feed.client.force_authenticate(feed.other)
    assert feed.client.get(detail(photo),{"navigation":"1"}).status_code==404


def test_neighbor_queries_are_bounded_instead_of_downloading_a_photo_collection(feed):
    photos=[feed.photo(when=feed.now-timedelta(days=index)) for index in range(35)]
    with CaptureQueriesContext(connection) as queries:
        response=feed.client.get(detail(photos[15]),{"navigation":"1"})
    assert response.status_code==200
    neighbor_queries=[q["sql"] for q in queries if 'plant_instances_journalphotoentry' in q["sql"] and 'LIMIT 1' in q["sql"]]
    assert len(neighbor_queries)>=3
    assert set(response.data["navigation"])=={"previous_id","next_id"}
