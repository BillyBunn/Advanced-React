import UpdateItem from '../components/UpdateItem';
import { createCipher } from 'crypto';

const Sell = props => (
  <div>
    <UpdateItem id={props.query.id} />
  </div>
);

export default Sell;
