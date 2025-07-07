import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TemplateForm } from "./components/templates/TemplateForm";
import { Admin } from "./components/admin/Admin";
import { Login } from "./components/utils/Login";
import QuillField from "./components/utils/QuillEditor";
function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path={"/"} element={<Login />} />
          <Route path={"/registration/*"} element={<TemplateForm />} />
          <Route path={"/admin"} element={<Admin/>} />
          <Route path={"/rich"} element={<QuillField />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
