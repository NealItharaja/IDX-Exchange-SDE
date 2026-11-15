import { formatDate, formatTime } from "../utils/format";
import "./OpenHouseList.css";

export function getOpenHouseRemarks(allData) {
    let data = allData;

    if (typeof data === "string") {
        try {
            data = JSON.parse(data);
        } catch {
            return null;
        }
    }

    const remarks = data && typeof data === "object" ? data.OpenHouseRemarks : null;
    return typeof remarks === "string" && remarks.trim() !== "" ? remarks.trim() : null;
}

function formatTimeRange(startTime, endTime) {
    const start = formatTime(startTime);
    const end = formatTime(endTime);

    if (start && end) return `${start} – ${end}`;
    return start ? `Starts ${start}` : "Time not listed";
}

function OpenHouseList({ openHouses }) {
    if (!openHouses || openHouses.length === 0) {
        return <p className="open-houses__empty">No open houses scheduled</p>;
    }

    return (
        <ul className="open-houses">
            {openHouses.map((openHouse) => {
                const remarks = getOpenHouseRemarks(openHouse.allData);

                return (
                    <li key={openHouse.id} className="open-houses__item">
                        <p className="open-houses__date">{formatDate(openHouse.date) ?? "Date not listed"}</p>
                        <p className="open-houses__time">{formatTimeRange(openHouse.startTime, openHouse.endTime)}</p>
                        {remarks && <p className="open-houses__remarks">{remarks}</p>}
                    </li>
                );
            })}
        </ul>
    );
}

export default OpenHouseList;
