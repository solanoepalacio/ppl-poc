import { redirect } from 'next/navigation';

/** The back office lands on the orders-by-day view; there is no home page. */
export default function Home() {
  redirect('/orders');
}
