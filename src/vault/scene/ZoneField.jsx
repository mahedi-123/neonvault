import { zones } from '../zoneConfig';
import Zone from './Zone';

const ZoneField = ({ isTouch, lite = false }) => (
  <group>
    {zones.map((zone) => (
      <Zone key={zone.id} config={zone} isTouch={isTouch} lite={lite} />
    ))}
  </group>
);

export default ZoneField;
