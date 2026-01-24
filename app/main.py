from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Iterable

import base64
import yaml
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

APP_ROOT = Path(__file__).resolve().parents[1]
YAML_DIR = APP_ROOT / "yaml_files"
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200

app = FastAPI(title="Public Catalog API", version="1.0.0")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

DATA_STORE: dict[str, Any] = {
    "items": [],
    "index": {},
    "errors": [],
    "filters": {},
}


class _CatalogSafeLoader(yaml.SafeLoader):
    pass


def _binary_constructor(loader: _CatalogSafeLoader, node: yaml.Node) -> str:
    raw_value = loader.construct_scalar(node)
    try:
        decoded = base64.b64decode(raw_value)
        return decoded.decode("utf-8", errors="replace")
    except Exception:
        return str(raw_value)


_CatalogSafeLoader.add_constructor("tag:yaml.org,2002:binary", _binary_constructor)


def _ensure_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if item is not None]
    return [str(value)]


def _pick_description(description: Any, preferred_lang: str = "en") -> tuple[str, str]:
    if not isinstance(description, dict):
        return "", ""
    if preferred_lang in description:
        data = description.get(preferred_lang, {})
        return str(data.get("shortDescription", "")).strip(), str(
            data.get("longDescription", "")
        ).strip()
    for _, data in description.items():
        if isinstance(data, dict):
            return str(data.get("shortDescription", "")).strip(), str(
                data.get("longDescription", "")
            ).strip()
    return "", ""


def _extract_languages(raw: dict[str, Any]) -> list[str]:
    languages: set[str] = set()
    description = raw.get("description")
    if isinstance(description, dict):
        languages.update([str(key) for key in description.keys()])
    localisation = raw.get("localisation") or {}
    available = localisation.get("availableLanguages")
    if isinstance(available, list):
        languages.update([str(lang) for lang in available if lang])
    return sorted(languages)


def _normalize_token(value: str) -> str:
    return value.strip().lower()


def _parse_filter_values(value: str | None) -> set[str]:
    if not value:
        return set()
    return {_normalize_token(part) for part in value.split(",") if part.strip()}


def _matches_filter(values: Iterable[str], required: set[str]) -> bool:
    if not required:
        return True
    normalized = {_normalize_token(value) for value in values if value}
    return not required.isdisjoint(normalized)


def _build_entry(file_path: Path, raw: dict[str, Any]) -> dict[str, Any]:
    name = str(raw.get("name", "")).strip()
    short_desc, long_desc = _pick_description(raw.get("description"))
    categories = _ensure_list(raw.get("categories"))
    platforms = _ensure_list(raw.get("platforms"))
    legal = raw.get("legal") or {}
    license_name = str(legal.get("license", "")).strip()
    development_status = str(raw.get("developmentStatus", "")).strip()
    software_type = str(raw.get("softwareType", "")).strip()
    release_date = str(raw.get("releaseDate", "")).strip()
    software_version = str(raw.get("softwareVersion", "")).strip()

    entry_id = file_path.stem
    summary = {
        "id": entry_id,
        "name": name,
        "shortDescription": short_desc,
        "categories": categories,
        "platforms": platforms,
        "license": license_name,
        "developmentStatus": development_status,
        "softwareType": software_type,
        "url": str(raw.get("url", "")).strip(),
        "landingURL": str(raw.get("landingURL", "")).strip(),
        "releaseDate": release_date,
    }

    return {
        **summary,
        "longDescription": long_desc,
        "softwareVersion": software_version,
        "languages": _extract_languages(raw),
        "sourceFile": file_path.name,
        "raw": raw,
    }


def _load_catalog() -> None:
    items: list[dict[str, Any]] = []
    errors: list[str] = []

    if not YAML_DIR.exists():
        errors.append(f"YAML directory not found: {YAML_DIR}")
    else:
        for file_path in sorted(YAML_DIR.glob("*.yml")):
            try:
                raw = yaml.load(
                    file_path.read_text(encoding="utf-8"),
                    Loader=_CatalogSafeLoader,
                )
                if not isinstance(raw, dict):
                    errors.append(f"Invalid YAML format in {file_path.name}")
                    continue
                items.append(_build_entry(file_path, raw))
            except Exception as exc:  # noqa: BLE001
                errors.append(f"Failed to read {file_path.name}: {exc}")

    items.sort(key=lambda item: item.get("name", "").lower())
    index = {item["id"]: item for item in items}

    DATA_STORE["items"] = items
    DATA_STORE["index"] = index
    DATA_STORE["errors"] = errors
    DATA_STORE["filters"] = _build_filters(items)


def _build_filters(items: list[dict[str, Any]]) -> dict[str, list[str]]:
    categories: set[str] = set()
    platforms: set[str] = set()
    licenses: set[str] = set()
    statuses: set[str] = set()
    types: set[str] = set()
    languages: set[str] = set()

    for item in items:
        categories.update(item.get("categories", []))
        platforms.update(item.get("platforms", []))
        if item.get("license"):
            licenses.add(item["license"])
        if item.get("developmentStatus"):
            statuses.add(item["developmentStatus"])
        if item.get("softwareType"):
            types.add(item["softwareType"])
        languages.update(item.get("languages", []))

    return {
        "categories": sorted(categories),
        "platforms": sorted(platforms),
        "licenses": sorted(licenses),
        "developmentStatuses": sorted(statuses),
        "softwareTypes": sorted(types),
        "languages": sorted(languages),
    }


def _apply_filters(
    items: list[dict[str, Any]],
    q: str | None,
    category: str | None,
    platform: str | None,
    license_name: str | None,
    status: str | None,
    software_type: str | None,
    language: str | None,
) -> list[dict[str, Any]]:
    required_categories = _parse_filter_values(category)
    required_platforms = _parse_filter_values(platform)
    required_licenses = _parse_filter_values(license_name)
    required_statuses = _parse_filter_values(status)
    required_types = _parse_filter_values(software_type)
    required_languages = _parse_filter_values(language)

    normalized_query = _normalize_token(q) if q else ""
    result: list[dict[str, Any]] = []

    for item in items:
        if not _matches_filter(item.get("categories", []), required_categories):
            continue
        if not _matches_filter(item.get("platforms", []), required_platforms):
            continue
        if required_licenses and _normalize_token(item.get("license", "")) not in required_licenses:
            continue
        if required_statuses and _normalize_token(item.get("developmentStatus", "")) not in required_statuses:
            continue
        if required_types and _normalize_token(item.get("softwareType", "")) not in required_types:
            continue
        if not _matches_filter(item.get("languages", []), required_languages):
            continue

        if normalized_query:
            haystack = " ".join(
                [
                    item.get("name", ""),
                    item.get("shortDescription", ""),
                    item.get("longDescription", ""),
                    item.get("url", ""),
                ]
            ).lower()
            if normalized_query not in haystack:
                continue

        result.append(item)

    return result


def _paginate(items: list[dict[str, Any]], page: int, page_size: int) -> dict[str, Any]:
    start = (page - 1) * page_size
    end = start + page_size
    sliced = items[start:end]
    return {
        "page": page,
        "pageSize": page_size,
        "total": len(items),
        "items": sliced,
    }


@app.on_event("startup")
def startup_load() -> None:
    _load_catalog()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "items": len(DATA_STORE.get("items", [])),
        "errors": DATA_STORE.get("errors", []),
    }


@app.get("/catalog/filters")
def catalog_filters() -> dict[str, list[str]]:
    return DATA_STORE.get("filters", {})


@app.get("/catalog")
def catalog_list(
    q: str | None = Query(None, description="Free text search across name/description"),
    category: str | None = Query(None, description="Comma-separated category filter"),
    platform: str | None = Query(None, description="Comma-separated platform filter"),
    license_name: str | None = Query(None, alias="license", description="Comma-separated license filter"),
    status: str | None = Query(None, description="Comma-separated developmentStatus filter"),
    software_type: str | None = Query(None, alias="type", description="Comma-separated softwareType filter"),
    language: str | None = Query(None, description="Comma-separated language filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
) -> dict[str, Any]:
    items = _apply_filters(
        DATA_STORE.get("items", []),
        q=q,
        category=category,
        platform=platform,
        license_name=license_name,
        status=status,
        software_type=software_type,
        language=language,
    )
    summaries = [
        {
            "id": item["id"],
            "name": item.get("name", ""),
            "shortDescription": item.get("shortDescription", ""),
            "categories": item.get("categories", []),
            "platforms": item.get("platforms", []),
            "license": item.get("license", ""),
            "developmentStatus": item.get("developmentStatus", ""),
            "softwareType": item.get("softwareType", ""),
            "url": item.get("url", ""),
            "landingURL": item.get("landingURL", ""),
            "releaseDate": item.get("releaseDate", ""),
        }
        for item in items
    ]
    return _paginate(summaries, page, page_size)


@app.get("/catalog/{entry_id}")
def catalog_detail(entry_id: str) -> dict[str, Any]:
    item = DATA_STORE.get("index", {}).get(entry_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item
