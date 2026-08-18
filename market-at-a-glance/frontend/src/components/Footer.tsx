export default function Footer({ disclaimer }: { disclaimer: string }) {
  return (
    <footer className="border-t border-neutral-800 mt-8">
      <div className="max-w-7xl mx-auto px-4 py-4 text-center text-[11px] text-neutral-500">
        {disclaimer}
      </div>
    </footer>
  );
}
