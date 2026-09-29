import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { updateServiceAction, deactivateServiceAction } from "@/actions/services";
import { ServiceForm } from "@/components/forms/ServiceForm";
import { pageWrap, pageTitle, cardClass, badgeClass, mutedText, linkDanger } from "@/lib/ui/classNames";

/**
 * Admin-only. No delete action exists on this screen — deactivate only
 * (via `isActive`), same pattern as Customer's archive. No reactivate
 * action exists, so once deactivated this screen becomes permanently
 * read-only, same as an archived Customer.
 */
export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  await requireRole(["ADMIN"]);

  const { serviceId } = await params;
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) notFound();

  return (
    <main className={pageWrap}>
      <div className="flex items-center gap-3">
        <h1 className={pageTitle}>{service.name}</h1>
        <span className={badgeClass(service.isActive ? "green" : "red")}>
          {service.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {!service.isActive ? (
        <div className={cardClass}>
          <p className={`${mutedText} mb-4`}>
            This service is inactive — read-only. Fields below reflect its
            last known values.
          </p>
          <dl className="text-sm flex flex-col gap-3">
            <div>
              <dt className={mutedText}>Category</dt>
              <dd className="text-neutral-900">{service.category ?? "—"}</dd>
            </div>
            <div>
              <dt className={mutedText}>Description</dt>
              <dd className="text-neutral-900">{service.description ?? "—"}</dd>
            </div>
            <div>
              <dt className={mutedText}>Placeholder price</dt>
              <dd className="text-neutral-900">
                {service.placeholderPrice !== null
                  ? `AED ${service.placeholderPrice.toString()}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className={mutedText}>Price source</dt>
              <dd className="text-neutral-900">{service.priceSource ?? "—"}</dd>
            </div>
            <div>
              <dt className={mutedText}>Price source date</dt>
              <dd className="text-neutral-900">
                {service.priceSourceDate
                  ? service.priceSourceDate.toISOString().slice(0, 10)
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className={cardClass}>
          <ServiceForm
            action={updateServiceAction.bind(null, service.id)}
            defaultValues={{
              name: service.name,
              category: service.category,
              description: service.description,
              placeholderPrice:
                service.placeholderPrice !== null
                  ? service.placeholderPrice.toString()
                  : null,
              priceSource: service.priceSource,
              priceSourceDate: service.priceSourceDate
                ? service.priceSourceDate.toISOString().slice(0, 10)
                : null,
            }}
            submitLabel="Save changes"
          />

          <form action={deactivateServiceAction.bind(null, service.id)} className="mt-4">
            <button type="submit" className={linkDanger}>
              Deactivate service
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
