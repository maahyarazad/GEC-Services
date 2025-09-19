
import { signal, computed } from "@preact/signals-react";



export function createAppState() { 
  const adminUser = signal(null);
  

  const setAdminUser = (_user) => {
    adminUser.value = _user;
  };

  const authenticated = computed(() => !!adminUser.value);

  return { adminUser, setAdminUser, authenticated };
}


