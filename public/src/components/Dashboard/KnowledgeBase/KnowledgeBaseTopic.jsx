import PropTypes from "prop-types";
import { Tooltip, IconButton, Chip } from "@mui/material";
import { MdPlayCircleOutline, MdOpenInNew } from "react-icons/md";

/**
 * One row in the knowledge base catalogue.
 *
 * A topic with no recording (`video: null`) renders its play control visibly
 * disabled and labelled "Not yet recorded", rather than offering a control that
 * fails when activated (FR-010).
 */
const KnowledgeBaseTopic = ({ topic, isSub = false, onViewVideo, onJump }) => {
    const hasVideo = Boolean(topic.video);

    return (
        <div className={`kb-topic${isSub ? " kb-topic--sub" : ""}`}>
            <div className="kb-topic__body">
                <p className="kb-topic__title">{topic.title}</p>
                {topic.summary && <p className="kb-topic__summary">{topic.summary}</p>}

                <div className="kb-topic__meta">
                    {hasVideo
                        ? topic.durationLabel && <span>{topic.durationLabel}</span>
                        : <Chip label="Not yet recorded" size="small" variant="outlined" />}
                </div>
            </div>

            <div className="kb-topic__actions">
                {/* <span> wrapper: MUI tooltips need a non-disabled child to fire on. */}
                <Tooltip title={hasVideo ? "Watch the tutorial" : "Tutorial not yet recorded"}>
                    <span>
                        <IconButton
                            size="small"
                            disabled={!hasVideo}
                            onClick={() => onViewVideo(topic)}
                            aria-label={`Watch the tutorial for ${topic.title}`}
                        >
                            <MdPlayCircleOutline size={20} />
                        </IconButton>
                    </span>
                </Tooltip>

                <Tooltip title="Go to this section">
                    <span>
                        <IconButton
                            size="small"
                            onClick={(event) => onJump(topic, event.currentTarget)}
                            aria-label={`Go to the section for ${topic.title}`}
                        >
                            <MdOpenInNew size={18} />
                        </IconButton>
                    </span>
                </Tooltip>
            </div>
        </div>
    );
};

KnowledgeBaseTopic.propTypes = {
    topic: PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        summary: PropTypes.string,
        durationLabel: PropTypes.string,
        video: PropTypes.shape({ videoId: PropTypes.string.isRequired }),
    }).isRequired,
    isSub: PropTypes.bool,
    onViewVideo: PropTypes.func.isRequired,
    onJump: PropTypes.func.isRequired,
};

export default KnowledgeBaseTopic;
