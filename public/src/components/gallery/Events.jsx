import { useEffect, useState } from "react";
import "./gallery-events.css";
import PropTypes from "prop-types";

export const Events = ({ data }) => {
  const [eventsData, setEventsData] = useState(null);

  useEffect(() => {
    if (!data) {
      return;
    }
    setEventsData(data.registration);
  }, [data]);

  return (
    <div className="gallery-events">
      <span className="gallery-header">
        <h4>Events Gallery</h4>
        <span>
          <button className="cta-button blue">
            <img alt="add-item" src="/add-item.svg"></img>
            <p>New</p>
          </button>
        </span>
      </span>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Index</th>
              <th>Event</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company Name</th>
            </tr>
          </thead>
          <tbody>
            {eventsData ? (
              Array.from(eventsData).map((item, index) => {
                return (
                  <tr key={item.email + index}>
                    <td>{index + 1}</td>
                    <td>{item.event}</td>
                    <td>{item.firstName + " " + item.lastName}</td>
                    <td>{item.email}</td>
                    <td>{item.phone}</td>
                    <td>{item.companyName}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td>No Data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

Events.propTypes = {
  data: PropTypes.array.isRequired,
};
