INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
	'signature-documents',
	'signature-documents',
	false,
	10485760,
	ARRAY['application/pdf', 'image/png']::text[]
)
ON CONFLICT ("id") DO UPDATE
SET
	"name" = EXCLUDED."name",
	"public" = EXCLUDED."public",
	"file_size_limit" = EXCLUDED."file_size_limit",
	"allowed_mime_types" = EXCLUDED."allowed_mime_types";
