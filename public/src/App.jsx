import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TemplateForm } from "./components/templates/TemplateForm";
import { Admin } from "./components/admin/Admin";
import { Login } from "./components/utils/Login";
import { UseGlobalFetch } from "./components/hooks/UseGlobalFetch";
import Editor from '../src/components/utils/RichTextEditor';
import GolderAdlerAward from './pages/GoldenAdlerAward';
import NotFoundPage from './pages/NotFoundPage';


function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path={"/"} element={<Login />} />
          <Route path={"/registration/*"} element={<TemplateForm />} />
          <Route path={"/admin"} element={<Admin/>} />
          <Route path={"/rich"} element={<Editor />} />
          <Route path='/golder-adler-award' element={ <GolderAdlerAward/>}></Route>
          {/* Catch-all route for 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
