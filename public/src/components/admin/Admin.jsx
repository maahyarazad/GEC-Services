import { Events } from "../gallery/Events";
import { Header } from "../utils/Header";
import PropTypes from "prop-types";
import "./admin.css";

export const Admin = ({ data }) => {

 // const [targetList, setTargetList] = useState([]);
    // useEffect(() => {
    //     const fetchData = async () => {
    //         try {
    //             const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config`, {
    //                 method: 'GET',
    //             });

    //             if (!response.ok) {
    //                 throw new Error('Failed to fetch');
    //             }

    //             const values = await response.json();
    //             console.log(values);
    //             setTargetList(values);
    //             debugger;

    //         } catch (err) {
    //             console.error('Error fetching data:', err);
    //         }
    //     };

    //     fetchData();
    // }, []);

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
