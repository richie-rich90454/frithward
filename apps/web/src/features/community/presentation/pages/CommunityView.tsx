import { HeartHandshake, MessageSquare, Users } from "lucide-solid";

export function CommunityView() {
    return (
        <section>
            <h1>
                <Users class="fw-icon" />
                Community
            </h1>
            <p>Frithward Commons resources and partnerships.</p>
            <ul class="resource-list">
                <li>
                    <HeartHandshake class="fw-icon" />
                    <div>
                        <h2>Community support</h2>
                        <p>People helping each other recognize and respond to suspicious content.</p>
                    </div>
                </li>
                <li>
                    <MessageSquare class="fw-icon" />
                    <div>
                        <h2>Share what you learn</h2>
                        <p>Report patterns that help others check messages and media.</p>
                    </div>
                </li>
            </ul>
        </section>
    );
}
