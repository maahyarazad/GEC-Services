import { GridFilterOperator } from '@mui/x-data-grid';

const containsOperator = {
  label: 'Contains',
  value: 'contains',
  getApplyFilterFn: (filterItem) => {
    if (!filterItem.value) return null;
    return ({ value }) =>
      value?.toString().toLowerCase().includes(filterItem.value.toString().toLowerCase());
  },
};

const isEmptyOperator = {
  label: 'Is Empty',
  value: 'isEmpty',
  getApplyFilterFn: () => {
    return ({ value }) => value === null || value === '';
  },
};

export { containsOperator, isEmptyOperator };
