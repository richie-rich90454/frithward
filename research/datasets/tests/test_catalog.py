import importlib.util
import sys
from pathlib import Path


def load_catalog():
    path = Path(__file__).parent.parent / "catalog.py"
    spec = importlib.util.spec_from_file_location("catalog", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["catalog"] = module
    spec.loader.exec_module(module)
    return module


def test_catalog_not_empty():
    catalog = load_catalog()
    assert len(catalog.list_entries()) > 0


def test_all_licenses_require_review():
    catalog = load_catalog()
    assert all(e.license_status == "review required" for e in catalog.list_entries())


def test_all_consent_flags_false():
    catalog = load_catalog()
    assert all(e.consent_flag is False for e in catalog.list_entries())


def test_get_known_and_unknown():
    catalog = load_catalog()
    assert catalog.get("librispeech") is not None
    assert catalog.get("not-a-dataset") is None
