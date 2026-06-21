export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This section is being built next.
      </p>
    </div>
  );
}
