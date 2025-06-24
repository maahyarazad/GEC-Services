import { Events } from "../gallery/Events";
import { Header } from "../utils/Header";
import PropTypes from "prop-types";
import "./admin.css";

export const Admin = ({ data }) => {
  return (
    <>
      <Header />
      <div className="admin">
        <div></div>
        <div>
          <Events data={data} />
        </div>
      </div>
    </>
  );
};

Admin.propTypes = {
  data: PropTypes.array.isRequired,
};
