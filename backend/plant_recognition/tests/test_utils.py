from plant_recognition.utils import normalize_plant_key


def test_normalize_plant_key_lowercases_and_replaces_separators():
    assert normalize_plant_key("Monstera deliciosa") == "monstera_deliciosa"
    assert normalize_plant_key("Philodendron 'Birkin'") == "philodendron_birkin"
    assert normalize_plant_key("Ficus-elastica/Robusta") == "ficus_elastica_robusta"
    assert normalize_plant_key("") == ""
