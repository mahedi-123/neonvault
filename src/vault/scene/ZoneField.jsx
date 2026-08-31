import { zones } from '../zoneConfig';
import Zone from './Zone';

const ZoneField = ({ isTouch }) => (
  <group>
    {zones.map((zone) => (
      <Zone key={zone.id} config={zone} isTouch={isTouch} />
    ))}
  </group>
);

export default ZoneField;
