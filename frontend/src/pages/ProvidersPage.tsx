import { api } from "../api/client";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/Card";
import { StateBlock } from "../components/ui/StateBlock";
import { useApi } from "../hooks/useApi";

export function ProvidersPage() {
  const providers = useApi(api.getProviders);

  return (
    <>
      <Header title="Providers" subtitle="DFTA-contracted senior-care delivery providers" />
      <div className="flex flex-col gap-4 p-6">
        {providers.loading || providers.error ? (
          <StateBlock loading={providers.loading} error={providers.error} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(providers.data ?? []).map((p) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{p.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{p.borough}</p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {p.seniorsServed.toLocaleString()} seniors
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{p.address}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
