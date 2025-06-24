import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TemplateForm } from "./components/templates/TemplateForm";
import { Admin } from "./components/admin/Admin";
import { Login } from "./components/utils/Login";
import { UseGlobalFetch } from "./components/hooks/UseGlobalFetch";

function App() {
  const data = UseGlobalFetch();
  console.log(data);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path={"/"} element={<Login />} />
          <Route path={"/registration"} element={<TemplateForm />} />
          <Route path={"/admin"} element={<Admin data={data} />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
