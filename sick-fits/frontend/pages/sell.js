import CreateItem from '../components/CreateItem'
import PleaseSignIn from '../components/PleaseSignIn'
import { createCipher } from 'crypto'

const Sell = () => (
  <div>
    <PleaseSignIn>
      <CreateItem />
    </PleaseSignIn>
  </div>
)

export default Sell
