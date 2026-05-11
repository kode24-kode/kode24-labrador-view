/**
 * Collabrador plugin for Labrador CMS
 * ©️ Labrador CMS AS
 */

export default {
    name: 'Collabrador Plugin',
    description: 'Enable Collabrador features in Baseview',
    version: '1.0.0',
    predicate: (api) => api.v1.config.get('collabrador.active'),
    
    behaviours: {
        bodytext: class {
            onInserted(model) {
                this.enabled = lab_api.v1.config.get('collabrador.active');
                if (!this.enabled) return;
                
                lab_api.v1.app.on('collabradorMessage', () => {
                    const views = lab_api.v1.view.getViews(model) || [];
                    
                    for (const view of views) {
                        const markup = view.getMarkup();
                        renderComments(model, markup);
                    }
                });
                
                lab_api.v1.customEvents.on('inlineCommentClicked', (data) => {
                    if (model.get('guid') !== data.guid) return;
                    
                    const views = lab_api.v1.view.getViews(model) || [];
                    
                    for (const view of views) {
                        const markup = view.getMarkup();
                        const comments = markup.querySelectorAll('collabrador-inline-comment') || [];
                        
                        for (const comment of comments) {
                            comment.removeAttribute('data-active');
                        }
                        
                        const activeComments = markup.querySelectorAll(`[data-comment-id="${data.commentId}"]`) || [];
                        
                        for (const comment of activeComments) {
                            
                            comment.setAttribute('data-active', true);
                        }
                    }

                    const desktopView = views.find(v => v.getViewport() === 'desktop');
                    const firstActive = desktopView?.getMarkup().querySelector(`[data-comment-id="${data.commentId}"]`);
                    if (firstActive) {
                        scrollToCommentIfNeeded(firstActive);
                    }
                });

                lab_api.v1.customEvents.on('clearActiveInlineComments', () => {
                    const views = lab_api.v1.view.getViews(model) || [];

                    for (const view of views) {
                        const markup = view.getMarkup();
                        renderComments(model, markup);
                    }
                });

                lab_api.v1.collection.on('closed', (uiInterface) => {
                    if (uiInterface.getName() !== 'Collabrador') return;

                    const views = lab_api.v1.view.getViews(model) || [];

                    for (const view of views) {
                        const markup = view.getMarkup();
                        renderComments(model, markup);
                    }
                });

            }

            onRendered(model, view) {
                if (!this.enabled) return;
                
                const markup = view.getMarkup();
                renderComments(model, markup);
            }
        },

        factbox: class {
            onInserted(model) {
                this.enabled = lab_api.v1.config.get('collabrador.active');
                if (!this.enabled) return;
                
                lab_api.v1.app.on('collabradorMessage', () => {
                    const views = lab_api.v1.view.getViews(model) || [];
                    
                    for (const view of views) {
                        const markup = view.getMarkup();
                        renderComments(model, markup);
                    }
                });
                
                lab_api.v1.customEvents.on('inlineCommentClicked', (data) => {
                    if (model.get('guid') !== data.guid) return;
                    
                    const views = lab_api.v1.view.getViews(model) || [];
                    
                    for (const view of views) {
                        const markup = view.getMarkup();
                        const comments = markup.querySelectorAll('collabrador-inline-comment') || [];
                        
                        for (const comment of comments) {
                            comment.removeAttribute('data-active');
                        }
                        
                        const activeComments = markup.querySelectorAll(`[data-comment-id="${data.commentId}"]`) || [];
                        
                        for (const comment of activeComments) {
                            comment.setAttribute('data-active', true);
                        }
                    }

                    const desktopView = views.find(v => v.getViewport() === 'desktop');
                    const firstActive = desktopView?.getMarkup().querySelector(`[data-comment-id="${data.commentId}"]`);
                    if (firstActive) {
                        scrollToCommentIfNeeded(firstActive);
                    }
                });

                lab_api.v1.customEvents.on('clearActiveInlineComments', () => {
                    const views = lab_api.v1.view.getViews(model) || [];

                    for (const view of views) {
                        const markup = view.getMarkup();
                        renderComments(model, markup);
                    }
                });

                lab_api.v1.collection.on('closed', (uiInterface) => {
                    if (uiInterface.getName() !== 'Collabrador') return;

                    const views = lab_api.v1.view.getViews(model) || [];

                    for (const view of views) {
                        const markup = view.getMarkup();
                        renderComments(model, markup);
                    }
                });
            }

            onRendered(model, view) {
                if (!this.enabled) return;
                
                const markup = view.getMarkup();
                renderComments(model, markup);
            }
        },

        text_multiline: class {
            onInserted(model) {
                this.enabled = lab_api.v1.config.get('collabrador.active');
                if (!this.enabled) return;
                
                lab_api.v1.app.on('collabradorMessage', () => {
                    const views = lab_api.v1.view.getViews(model) || [];
                    
                    for (const view of views) {
                        const markup = view.getMarkup();
                        renderComments(model, markup);
                    }
                });
                
                lab_api.v1.customEvents.on('inlineCommentClicked', (data) => {
                    if (model.get('guid') !== data.guid) return;
                    
                    const views = lab_api.v1.view.getViews(model) || [];
                    
                    for (const view of views) {
                        const markup = view.getMarkup();
                        const comments = markup.querySelectorAll('collabrador-inline-comment') || [];
                        
                        for (const comment of comments) {
                            comment.removeAttribute('data-active');
                        }
                        
                        const activeComments = markup.querySelectorAll(`[data-comment-id="${data.commentId}"]`) || [];
                        
                        for (const comment of activeComments) {
                            comment.setAttribute('data-active', true);
                        }
                    }

                    const desktopView = views.find(v => v.getViewport() === 'desktop');
                    const firstActive = desktopView?.getMarkup().querySelector(`[data-comment-id="${data.commentId}"]`);
                    if (firstActive) {
                        scrollToCommentIfNeeded(firstActive);
                    }
                });

                lab_api.v1.customEvents.on('clearActiveInlineComments', () => {
                    const views = lab_api.v1.view.getViews(model) || [];
                    
                    for (const view of views) {
                        const markup = view.getMarkup();
                        renderComments(model, markup);
                    }
                });
                
                lab_api.v1.collection.on('closed', (uiInterface) => {
                    if (uiInterface.getName() !== 'Collabrador') return;
                    
                    const views = lab_api.v1.view.getViews(model) || [];
                    
                    for (const view of views) {
                        const markup = view.getMarkup();
                        renderComments(model, markup);
                    }
                });
            }

            onRendered(model, view) {
                if (!this.enabled) return;
                
                const markup = view.getMarkup();
                renderComments(model, markup);
            }
        }
    },

};

function scrollToCommentIfNeeded(element) {
    const margin = 200;
    const iframeEl = element.ownerDocument?.defaultView?.frameElement;
    const elRect = element.getBoundingClientRect();

    if (iframeEl) {
        const iframeRect = iframeEl.getBoundingClientRect();
        const absoluteTop = iframeRect.top + elRect.top;
        const absoluteBottom = iframeRect.top + elRect.bottom;

        if (absoluteTop < margin || absoluteBottom > window.innerHeight - margin) {
            const targetY = window.scrollY + absoluteTop - (window.innerHeight / 2);
            window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
    } else if (elRect.top < margin || elRect.bottom > window.innerHeight - margin) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

let pendingAllComments = null;

function getAllComments() {
    if (pendingAllComments) return pendingAllComments;

    pendingAllComments = lab_api.v1.collabrador.getInlineComments().finally(() => {
        pendingAllComments = null;
    });

    return pendingAllComments;
}

async function renderComments(model, markup, allComments) {
    if (!allComments) {
        allComments = await getAllComments();
        if (!Array.isArray(allComments)) return;
    }

    const guid = model.get('guid');
    const comments = allComments.filter(c => c.tagGuid === guid);

    lab_api.v1.editor.comments.renderHighlights(
        markup,
        comments
    );

    if (lab_api.v1.model.query.hasChildOfTypes(model, ['factbox', 'text_multiline'])) {
        const children = [
            ...lab_api.v1.model.query.getChildrenOfType(model, 'factbox'),
            ...lab_api.v1.model.query.getChildrenOfType(model, 'text_multiline'),
        ];

        for (const child of children) {
            const views = lab_api.v1.view.getViews(child) || [];

            for (const view of views) {
                renderComments(child, view.getMarkup(), allComments);
            }
        }
    }
}
