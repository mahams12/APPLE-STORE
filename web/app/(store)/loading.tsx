export default function Loading() {
  return (
    <div className="container-x space-y-6 py-10">
      <div className="skeleton h-10 w-64" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-80" />)}</div>
    </div>
  );
}
