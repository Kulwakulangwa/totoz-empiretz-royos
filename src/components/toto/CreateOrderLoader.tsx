import React, { useEffect, useState, type ComponentType } from 'react';

export default function CreateOrderLoader(props: any) {
  const [Comp, setComp] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    // Build the module path at runtime from char codes so the bundler cannot statically
    // analyze and include the client-only module in the server bundle.
    const part1 = String.fromCharCode(99,114,101,97,116,101); // 'create'
    const dot = String.fromCharCode(46); // '.'
    const part2 = String.fromCharCode(98,114,111,119,115,101,114); // 'browser'
    const name = part1 + dot + part2; // 'create.browser'
    const modPath = '@/components/orders/' + name;
    // @ts-ignore
    import(/* @vite-ignore */ modPath)
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
