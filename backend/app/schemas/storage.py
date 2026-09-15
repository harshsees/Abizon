from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

StorageKey = Annotated[str, Field(min_length=3, max_length=512)]


class _Strict(BaseModel):
    # Unknown fields are an error, not ignored: a client sending `bucket` or
    # `acl` believes it controls something it does not.
    model_config = ConfigDict(extra="forbid")


class UploadUrlRequest(_Strict):
    key: StorageKey
    content_type: str = Field(max_length=80)


class KeyRequest(_Strict):
    key: StorageKey


class DeleteRequest(_Strict):
    area: Literal["incoming", "documents"]
    keys: list[StorageKey] = Field(min_length=1, max_length=1000)


class PresignedOut(BaseModel):
    url: str
    method: Literal["GET", "PUT"]
    headers: dict[str, str]
    expires_in: int


class DownloadOut(PresignedOut):
    byte_size: int


class DeleteOut(BaseModel):
    deleted: int
