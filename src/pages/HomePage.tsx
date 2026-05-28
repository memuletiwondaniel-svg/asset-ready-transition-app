import { Navigate } from "react-router-dom";

const HomePage = () => {
  return <Navigate to="/my-tasks" replace />;
};

export default HomePage;