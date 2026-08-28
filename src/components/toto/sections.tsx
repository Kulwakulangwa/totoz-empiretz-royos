async function save() {
  if (!form.name.trim()) {
    toast("Product name is required.");
    return;
  }

  // Determine the default branch from the current shop
  const defaultShop: ShopId = shop === "all" ? "toto" : shop;

  // Build stock object – only include the current branch
  const stock: Partial<Record<ShopId, number>> = {};
  const quantity = Number(form.stock[defaultShop]) || 0;
  if (quantity > 0 || shop !== "all") {
    stock[defaultShop] = quantity;
  }

  const payload = {
    name: form.name.trim(),
    sku: form.sku.trim(),
    barcode: normalizeBarcodeToken(form.barcode || form.sku),
    category: form.category.trim() || "General",
    buy: Number(form.buy) || 0,
    sell: Number(form.sell) || 0,
    min: Number(form.min) || 0,
    stock,
    imageFile: form.imageFile,
    removeImage: form.removeImage,
  };

  setSaving(true);
  let result: SaveResult;
  try {
    // Pass the current shop as branch override
    result = await (editing
      ? updateProduct(editing, payload, defaultShop)
      : addProduct(payload, defaultShop)
    );
  } catch (err: any) {
    toast("Product could not be saved", {
      description: err?.message || "Please try again.",
    });
    return;
  } finally {
    setSaving(false);
  }

  if (!result.ok) {
    toast(result.error);
    return;
  }

  toast(editing ? "Product updated" : "Product added", {
    description: `${result.product.name} · ${result.product.barcode}`,
  });
  closeProductDialog();
}
