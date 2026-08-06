import { getManagedClients } from '@/lib/api';
import { ViewHeader } from '../ViewHeader';
import { ClientDirectory } from './ClientDirectory';

/**
 * Back-office Clientes view: the whole client directory, retired clients
 * included, with the controls to maintain it. Its own destination rather than
 * something launched from the orders view — maintaining the directory is done
 * rarely, before or after the day's orders, and the manager arrives with that
 * intent rather than mid-order.
 */
export default async function ClientesPage() {
  const clients = await getManagedClients();
  const active = clients.filter((c) => c.active).length;

  return (
    <>
      <ViewHeader
        title="Clientes"
        subtitle={
          clients.length === active
            ? `${active} ${active === 1 ? 'cliente' : 'clientes'}`
            : `${active} activos · ${clients.length - active} inactivos`
        }
      />
      <div className="bo-content">
        <ClientDirectory clients={clients} />
      </div>
    </>
  );
}
