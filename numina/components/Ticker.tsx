export default function Ticker({ items }: { items: string[] }) {
  const text = items.join("  ·  ") + "  ·  ";
  const doubled = text + text; // duplicate for seamless loop
  return (
    <div style={{ background: "#000000", borderBottom: "1px solid #FFFFFF", overflow: "hidden" }}
         className="py-2">
      <div className="ticker-track pixel text-[8px] text-primary">
        {doubled}
      </div>
    </div>
  );
}
