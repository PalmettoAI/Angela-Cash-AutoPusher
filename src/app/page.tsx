import Link from "next/link";
import { db } from "@/db";
import { destinations, listings, pushAttempts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [allListings, allDestinations, allAttempts] = await Promise.all([
    db.select().from(listings).orderBy(desc(listings.createdAt)).limit(50),
    db.select().from(destinations),
    db.select().from(pushAttempts).orderBy(desc(pushAttempts.createdAt)),
  ]);

  // index latest push status per (listing, destination)
  const latestStatus = new Map<string, "pending" | "success" | "failed">();
  for (const a of allAttempts) {
    const k = `${a.listingId}::${a.destinationKey}`;
    if (!latestStatus.has(k)) latestStatus.set(k, a.status);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Listings</h1>
          <p className="text-sm text-muted-foreground">
            All commercial listings, plus their per-destination push status.
          </p>
        </div>
        <Button asChild>
          <Link href="/listings/new">+ New listing</Link>
        </Button>
      </div>

      {allListings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No listings yet</CardTitle>
            <CardDescription>
              Create your first commercial listing to see it here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/listings/new">Create a listing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allListings.map((l) => (
            <Card key={l.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      <Link href={`/listings/${l.id}`} className="hover:underline">
                        {l.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {l.subtype} · {l.city}, {l.state} · {l.listingType}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {allDestinations.map((d) => {
                      const status = latestStatus.get(`${l.id}::${d.key}`) ?? "pending";
                      const variant =
                        status === "success" ? "success" :
                        status === "failed" ? "destructive" :
                        "secondary";
                      return (
                        <Badge key={d.key} variant={variant} className="text-[10px]">
                          {d.displayName}: {status === "pending" ? "—" : status}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/listings/${l.id}/review`}>Review</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/listings/${l.id}/paragon`}>Paragon paste</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
