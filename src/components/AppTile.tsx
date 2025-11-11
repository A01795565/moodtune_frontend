import { Link } from 'react-router-dom';
import './AppTile.css';

type Props = {
  to: string;
  title: string;
  desc?: string;
};

export default function AppTile({ to, title, desc }: Props) {
  return (
    <Link to={to} className="tile">
      <div className="tile__title">{title}</div>
      {desc && <div className="tile__desc">{desc}</div>}
    </Link>
  );
}
