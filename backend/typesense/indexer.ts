import type { Client } from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import type { TypesenseDocument } from "./transformer";

/**
 * Collection 재생성 (기존 삭제 → 새로 생성)
 */
export async function recreateCollection(
  client: Client,
  schema: CollectionCreateSchema,
): Promise<void> {
  // 기존 Collection 삭제
  try {
    await client.collections(schema.name).delete();
    console.log(`✓ Deleted existing collection: ${schema.name}`);
  } catch {
    console.log(`✓ No existing collection to delete: ${schema.name}`);
  }

  // Collection 생성
  await client.collections().create(schema);
  console.log(`✓ Created collection: ${schema.name}`);
}

/**
 * 문서 배치 인덱싱
 */
export async function indexDocuments(
  client: Client,
  collectionName: string,
  documents: TypesenseDocument[],
  batchSize = 100,
): Promise<void> {
  console.log(`\nIndexing ${documents.length} documents...`);

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);

    try {
      const results = await client
        .collections(collectionName)
        .documents()
        .import(batch, { action: "upsert" });

      // 실패한 문서 확인
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        console.error(
          `✗ Batch ${Math.floor(i / batchSize) + 1}: ${failures.length} failures`,
        );
        failures.forEach((f) => {
          console.error(`  - Document ${f.document}: ${f.error}`);
        });
      } else {
        console.log(
          `✓ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} documents indexed (${Math.min(i + batchSize, documents.length)}/${documents.length})`,
        );
      }
    } catch (error) {
      console.error(
        `✗ Batch ${Math.floor(i / batchSize) + 1} failed:`,
        error,
      );
    }
  }

  console.log(`\n✓ Indexing completed!`);
}
