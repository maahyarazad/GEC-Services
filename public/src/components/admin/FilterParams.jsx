const FilterParams = (filterModel) => {
  if (!Array.isArray(filterModel?.items)) return '';

  return filterModel.items
    .filter(item => {
      // Must have a field
      if (!item?.field) return false;

      // Keep if operator is defined (like isEmpty / isNotEmpty)
      if (item?.operator) return true;

      // Keep if value is defined (not undefined or null)
      return item?.value !== undefined && item?.value !== null && item?.value !== '';
    })
    .map(item => {
      switch (item.operator) {
        case 'isEmpty':
          return `filter_${item.field}=isEmpty`;
        case 'isEqual':
          return `filter_${item.field}=isEqual`;
        case 'isNotEmpty':
          return `filter_${item.field}=isNotEmpty`;
        default:
          return `filter_${item.field}=${encodeURIComponent(item.value)}`;
      }
    })
    .join('&');
};

export default FilterParams;
