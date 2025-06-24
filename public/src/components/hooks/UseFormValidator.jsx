export const UseFormValidator = (values) => {
  values.forEach((item) => item.parentElement.classList.remove("invalid"));
  let empty = [];

  values.forEach((item) => {
    if (item.value === "") {
      empty.push(item);
    }
  });

  if (empty.length !== 0) {
    empty.forEach((item) => item.parentElement.classList.add("invalid"));
    return false;
  }
  return true;
};
