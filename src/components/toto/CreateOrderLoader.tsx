import React, { useEffect, useState, type ComponentType } from 'react';

export default function CreateOrderLoader(props: any) {
  const [Comp, setComp] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    import('@/routes/orders/create.client')
      .then((m) => {
        if (mounted && m && m.default) setComp(() => m.default as ComponentType<any>);
      })
      .catch((err) => {
        console.error('Failed to load CreateOrder page client module:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Comp) return <div>Loading create order…</div>;
  return <Comp {...props} />;
}
