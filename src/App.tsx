import { ChangeEvent, useEffect, useState } from "react";
import { useIndexedDB } from "hooks/useIndexedDB";
import { Database } from "utils/constants";
import "./App.css";

// Interface defining the structure of the data
interface Data {
  firstname: string;
  lastname: string;
  id: number;
}

function App() {
  // Destructuring functions and variables from the custom hook
  const {
    putValue,
    getValue,
    getAllValue,
    updateValue,
    deleteValue,
    isDBConnecting,
  } = useIndexedDB(Database.name, [Database.userTable]);

  // State variables
  const [formData, setFormData] = useState({ firstname: "", lastname: "" });
  const [items, setItems] = useState<Data[]>([]);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  // Function to fetch the latest values from the database
  const getLatestValues = () => {
    getAllValue(Database.userTable).then((value) => {
      setItems(value);
    });
  };

  // Effect to fetch data when database connection status changes
  useEffect(() => {
    if (!isDBConnecting) getLatestValues();
  }, [isDBConnecting]);

  // Handler for form input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handler for form submission
  const handleSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission behavior
    if (isEditing !== null) {
      updateValue({
        tableName: Database.userTable,
        id: isEditing,
        newItem: formData,
      });
      setIsEditing(null);
    } else {
      putValue(Database.userTable, formData);
    }
    setFormData({ firstname: "", lastname: "" });
    getLatestValues(); // Refresh the list after submission
  };

  // Handler to set the form for editing a record
  const handleEdit = (id: number) => {
    getValue(Database.userTable, id).then((value) => {
      const { firstname, lastname } = value;
      setFormData({ firstname, lastname });
    });
    setIsEditing(id);
  };

  // Handler to delete a record
  const handleDelete = (id: number) => {
    deleteValue(Database.userTable, id);
    getLatestValues();
  };

  // Return null if the database is still connecting
  if (isDBConnecting) return null;

  return (
    <div className="app">
      <header>
        <h1>Form and List</h1>
      </header>
      <div className="container">
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="firstname"
              value={formData.firstname}
              onChange={handleChange}
              placeholder="First Name"
            />
            <input
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              placeholder="Last Name"
            />
            <button type="submit">
              {isEditing !== null ? "Update" : "Submit"}
            </button>
          </form>
        </div>
        <div className="list-container">
          <ul>
            {items.map(({ id, firstname, lastname }) => (
              <li key={id}>
                <span className="user-name">
                  {firstname} {lastname}
                </span>
                <div className="button-group">
                  <button onClick={() => handleEdit(id)}>Edit</button>
                  <button onClick={() => handleDelete(id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
