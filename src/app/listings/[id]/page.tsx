import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { listings, listingPhotos, listingDocuments, pushAttempts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { destinationAdapters } from "@/destinations";
import { PushControls } from "./push-controls";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const [row] = await db.select().from(listings).where(eq(listings.id, params.id));
  if (!row) notFound();

  const [photos, docs, attempts] = await Promise.all([
    db.select().from(listingPhotos).where(eq(listingPhotos.listingId, params.id)),
    db.select().from(listingDocuments).where(eq(listingDocuments.listingId, params.id)),
    db
      .select()
      .from(pushAttempts)
      .where(eq(pushAttempts.listingId, params.id))
      .orderBy(desc(pushAttempts.createdAt)),
  ]);

  const latest = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) if (!latest.has(a.destinationKey)) latest.set(a.destinationKey, a);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{row.title}</h1>
          <p className="text-sm text-muted-foreground">
            {row.subtype} · {row.street}, {row.city}, {row.state} {row.zip}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/listings/${row.id}/review`}>Review & push</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/listings/${row.id}/paragon`}>Paragon paste</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Per-destination status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {destinationAdapters.map((d) => {
              const a = latest.get(d.key);
              const variant =
                a?.status === "success" ? "success" :
                a?.status === "failed" ? "destructive" :
                "secondary";
              return (
                <div key={d.key} className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0">
                  <div>
                    <div className="text-sm font-medium">{d.displayName}</div>
                    {a?.completedAt && (
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.completedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={variant}>{a?.status ?? "—"}</Badge>
                    <PushControls listingId={row.id} destinationKey={d.key} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos & documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="font-medium">Photos ({photos.length})</div>
              <ul className="ml-4 list-disc text-muted-foreground">
                {photos.map((p) => <li key={p.id} className="truncate">{p.url}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-medium">Documents ({docs.length})</div>
              <ul className="ml-4 list-disc text-muted-foreground">
                {docs.map((d) => <li key={d.id} className="truncate">{d.url}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent push attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pushes yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {attempts.slice(0, 20).map((a) => (
                <li key={a.id} className="flex justify-between border-b py-1 last:border-b-0">
                  <span>
                    <Badge variant={a.status === "success" ? "success" : a.status === "failed" ? "destructive" : "secondary"} className="mr-2">{a.status}</Badge>
                    {a.destinationKey}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
