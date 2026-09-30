import Link from "next/link";
import { createCustomerAction } from "@/actions/customers";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { pageWrap, pageTitle, pageSubtitle, cardClass, link } from "@/lib/ui/classNames";

export default function NewCustomerPage() {
  return (
    <main className={pageWrap}>
      <div>
        <Link href="/customers" className={link}>
          ← Back to customers
        </Link>
        <h1 className={`${pageTitle} mt-2`}>New Customer</h1>
        <p className={pageSubtitle}>Add a customer to the address book.</p>
      </div>
      <div className={`${cardClass} max-w-xl`}>
        <CustomerForm mode="create" action={createCustomerAction} />
      </div>
    </main>
  );
}
