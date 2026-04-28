import { ListingForm } from "@/components/ListingForm";

export default function NewListingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New listing</h1>
        <p className="text-sm text-muted-foreground">
          Enter the master record once; review and push to each destination on the next screen.
        </p>
      </div>
      <ListingForm />
    </div>
  );
}
