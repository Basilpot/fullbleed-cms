import Link from "next/link";

export default function WildCard() {
  return (
    <div className="flex gap-1 items-center flex-col min-h-[80vh] justify-center"> <p>
      You&apos;ve found something interesting. Now correct yourself and get back to work!
    </p>
      <div className="flex gap-4 mt-8">
        <Link  className="underline hover:text-primary" href="/dashboard">Dashboard</Link> |
        <Link  className="underline hover:text-primary" href="/orders">Orders</Link> |
        <Link  className="underline hover:text-primary" href="/settings">Settings</Link>
    </div>
    </div>
  )
}
