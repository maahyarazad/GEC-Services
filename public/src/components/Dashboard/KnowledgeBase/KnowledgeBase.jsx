import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextField, InputAdornment, IconButton, Button } from "@mui/material";
import { MdSearch, MdClose } from "react-icons/md";
import KnowledgeBaseTopic from "./KnowledgeBaseTopic";
import VideoDialog from "./VideoDialog";
import JumpMenu from "./JumpMenu";
import { logKnowledgeBaseView } from "./knowledgeBase.telemetry";
import {
    KNOWLEDGE_BASE_TOPICS,
    SECTION_LABELS,
    SECTION_ORDER,
    buildDestinationUrl,
    destinationsFor,
} from "./knowledgeBase.catalog";
import "./KnowledgeBase.css";

const matches = (topic, term) =>
    `${topic.title} ${topic.summary || ""}`.toLowerCase().includes(term);

/**
 * Knowledge Base section.
 *
 * Lists every task an administrator can perform, grouped by the section of the
 * dashboard it belongs to, each with a tutorial video and a jump control.
 *
 * The catalogue is fixed in the application (FR-017) — see knowledgeBase.catalog.js.
 */
const KnowledgeBase = () => {
    const navigate = useNavigate();

    const [search, setSearch] = useState("");
    const [videoTopic, setVideoTopic] = useState(null);
    const [jumpAnchor, setJumpAnchor] = useState(null);
    const [jumpDestinations, setJumpDestinations] = useState([]);

    const term = search.trim().toLowerCase();

    // Filtering keeps a parent whenever it matches OR any of its sub-topics does,
    // so a matching sub-topic always arrives with enough context to place it (FR-013).
    const groups = useMemo(() => {
        return SECTION_ORDER.map((slug) => {
            const topics = KNOWLEDGE_BASE_TOPICS
                .filter((topic) => topic.sectionSlug === slug)
                .map((topic) => {
                    if (!term) return topic;

                    const subs = (topic.subTopics || []).filter((sub) => matches(sub, term));
                    if (matches(topic, term)) return { ...topic, subTopics: topic.subTopics };
                    if (subs.length) return { ...topic, subTopics: subs, isContextOnly: true };
                    return null;
                })
                .filter(Boolean)
                .sort((a, b) => a.order - b.order);

            return { slug, label: SECTION_LABELS[slug] || slug, topics };
        }).filter((group) => group.topics.length > 0);
    }, [term]);

    const handleViewVideo = (topic) => {
        setVideoTopic(topic);
        logKnowledgeBaseView(topic.id, "topic_opened");
    };

    const handleJump = (topic, anchor) => {
        const destinations = destinationsFor(topic);

        // A topic with sub-topics offers a choice; one without navigates straight
        // through, with no intermediate step (FR-018).
        if (destinations.length === 1) {
            goTo(destinations[0]);
            return;
        }

        setJumpDestinations(destinations);
        setJumpAnchor(anchor);
    };

    const goTo = (destination) => {
        const url = buildDestinationUrl(destination);
        if (!url) return;

        setJumpAnchor(null);

        // PUSH, not replace — Back must return here rather than to the dashboard's
        // default landing section (FR-009).
        navigate(url, { state: { tab: destination.tab } });
    };

    const totalShown = groups.reduce((sum, group) => sum + group.topics.length, 0);

    return (
        <div className="kb">
            <div className="kb__header">
                <h2 className="kb__title">Knowledge Base</h2>
                <p className="kb__subtitle">
                    What you can do in the admin dashboard, with a short tutorial for each.
                </p>
            </div>

            <TextField
                className="kb__search"
                fullWidth
                size="small"
                placeholder="Search topics — try “guest list” or “auto response”"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <MdSearch />
                            </InputAdornment>
                        ),
                        endAdornment: search ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearch("")} aria-label="Clear search">
                                    <MdClose size={16} />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    },
                }}
            />

            {totalShown === 0 ? (
                <div className="kb__empty">
                    <p>No topics match “{search}”.</p>
                    <Button size="small" onClick={() => setSearch("")}>
                        Clear search
                    </Button>
                </div>
            ) : (
                groups.map((group) => (
                    <div className="kb__group" key={group.slug}>
                        <div className="kb__group-title">{group.label}</div>

                        {group.topics.map((topic) => (
                            <div key={topic.id}>
                                {/* When only a sub-topic matched, the parent is shown as
                                    context rather than as a result in its own right. */}
                                {topic.isContextOnly ? (
                                    <p className="kb__parent-context">In “{topic.title}”</p>
                                ) : (
                                    <KnowledgeBaseTopic
                                        topic={topic}
                                        onViewVideo={handleViewVideo}
                                        onJump={handleJump}
                                    />
                                )}

                                {(topic.subTopics || [])
                                    .slice()
                                    .sort((a, b) => a.order - b.order)
                                    .map((sub) => (
                                        <KnowledgeBaseTopic
                                            key={sub.id}
                                            topic={sub}
                                            isSub
                                            onViewVideo={handleViewVideo}
                                            onJump={handleJump}
                                        />
                                    ))}
                            </div>
                        ))}
                    </div>
                ))
            )}

            <VideoDialog
                topic={videoTopic}
                open={Boolean(videoTopic)}
                onClose={() => setVideoTopic(null)}
                onPlay={() => videoTopic && logKnowledgeBaseView(videoTopic.id, "video_played")}
            />

            <JumpMenu
                anchorEl={jumpAnchor}
                destinations={jumpDestinations}
                open={Boolean(jumpAnchor)}
                onClose={() => setJumpAnchor(null)}
                onSelect={goTo}
            />
        </div>
    );
};

export default KnowledgeBase;
