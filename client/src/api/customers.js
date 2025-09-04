// client/src/api/customers.js
export async function fetchCustomers() {
  const res = await fetch('/api/customers', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Fetch customers HTTP ${res.status}`);
  return res.json(); // [{id,name,email,active}]
}
