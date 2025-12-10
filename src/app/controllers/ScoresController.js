export default class ScoresController {
    constructor({ statusEl, containerEl }) {
        this.statusEl = statusEl;
        this.containerEl = containerEl;
        this.unsubscribeListeners = [];
        this.teamsData = new Map(); // team -> { members: [], lastUpdate: timestamp }
    }

    async init() {
        if (!window.firebaseDb) {
            this.updateStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }

        this.updateStatus('Loading top scores from Firebase...');
        await this.loadTopScores();
    }

    destroy() {
        // Unsubscribe from all listeners
        this.unsubscribeListeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.unsubscribeListeners = [];
        this.teamsData.clear();
    }

    async loadTopScores() {
        if (!window.firebaseDb) {
            this.updateStatus('Firebase is not initialized.');
            return;
        }

        const { collection, query, orderBy, limit, onSnapshot, where } = window.firebaseFirestore || {};
        if (!collection || !query || !orderBy || !limit) {
            this.updateStatus('Firestore functions not available.');
            return;
        }

        try {
            // Get list of all teams first
            const membersRef = collection(window.firebaseDb, 'teamMembers');
            const allMembersQuery = query(membersRef);
            
            // Set up realtime listener for all members
            const unsubscribe = onSnapshot(allMembersQuery, (snapshot) => {
                this.processMembersSnapshot(snapshot);
            }, (error) => {
                console.error('Error in scores listener:', error);
                this.updateStatus(`Error loading scores: ${error.message}`);
            });

            this.unsubscribeListeners.push(unsubscribe);
            this.updateStatus('Listening for real-time score updates...');
        } catch (error) {
            console.error('Error setting up scores listener:', error);
            this.updateStatus(`Error: ${error.message}`);
        }
    }

    processMembersSnapshot(snapshot) {
        // Group members by team
        const teamsMap = new Map();

        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const team = data.team;
            const score = data.competitionCurrent;
            
            // Only include members with a team and a valid score
            if (team && (score !== null && score !== undefined)) {
                if (!teamsMap.has(team)) {
                    teamsMap.set(team, []);
                }
                
                teamsMap.get(team).push({
                    userId: data.userID || docSnapshot.id,
                    playername: data.playername || `User ${data.userID || docSnapshot.id}`,
                    score: Number(score) || 0,
                    attacks: data.competitionAttacks || null,
                    level: data.level || 0,
                    updatedAt: data.competitionUpdatedAt || null
                });
            }
        });

        // Sort each team's members by score (descending) and take top 50
        teamsMap.forEach((members, team) => {
            members.sort((a, b) => b.score - a.score);
            teamsMap.set(team, members.slice(0, 50));
        });

        this.teamsData = teamsMap;
        this.renderScores();
        
        const totalPlayers = Array.from(teamsMap.values()).reduce((sum, members) => sum + members.length, 0);
        this.updateStatus(`Loaded top 50 players for ${teamsMap.size} teams (${totalPlayers} total players)`);
    }

    renderScores() {
        if (!this.containerEl) return;

        this.containerEl.innerHTML = '';

        if (this.teamsData.size === 0) {
            this.containerEl.innerHTML = '<p style="padding: 1rem; text-align: center; color: #666;">No scores available yet. Scores will appear here as they are updated.</p>';
            return;
        }

        // Sort teams alphabetically
        const sortedTeams = Array.from(this.teamsData.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        sortedTeams.forEach(([teamName, members]) => {
            const teamSection = document.createElement('div');
            teamSection.style.marginBottom = '2rem';
            teamSection.style.border = '2px solid var(--color-peach)';
            teamSection.style.borderRadius = '12px';
            teamSection.style.overflow = 'hidden';
            teamSection.style.background = 'white';

            // Team header
            const teamHeader = document.createElement('div');
            teamHeader.style.background = 'linear-gradient(135deg, var(--color-coral) 0%, var(--color-rose) 100%)';
            teamHeader.style.padding = '1rem 1.5rem';
            teamHeader.style.color = 'white';
            teamHeader.style.fontWeight = 'bold';
            teamHeader.style.fontSize = '1.3rem';
            teamHeader.innerHTML = `${teamName} <span style="font-size: 0.9rem; font-weight: normal; opacity: 0.9;">(${members.length} players)</span>`;
            teamSection.appendChild(teamHeader);

            // Members table
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            
            // Table header
            const thead = document.createElement('thead');
            thead.style.background = '#f8f9fa';
            const headerRow = document.createElement('tr');
            ['Rank', 'Player', 'Score', 'Attacks', 'Level'].forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.padding = '0.75rem 1rem';
                th.style.textAlign = 'left';
                th.style.fontWeight = '600';
                th.style.borderBottom = '2px solid var(--color-peach)';
                if (headerText === 'Rank' || headerText === 'Score' || headerText === 'Attacks' || headerText === 'Level') {
                    th.style.textAlign = 'center';
                }
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Table body
            const tbody = document.createElement('tbody');
            members.forEach((member, index) => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #e9ecef';
                
                if (index < 3) {
                    row.style.background = index === 0 ? '#fff3cd' : index === 1 ? '#e2e3e5' : '#cd7f32';
                    if (index === 0) row.style.fontWeight = 'bold';
                }
                
                row.style.transition = 'background 0.2s';

                // Rank
                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                rankCell.style.padding = '0.75rem 1rem';
                rankCell.style.textAlign = 'center';
                rankCell.style.fontWeight = index < 3 ? 'bold' : 'normal';
                rankCell.style.fontSize = index === 0 ? '1.1rem' : '1rem';
                row.appendChild(rankCell);

                // Player name
                const nameCell = document.createElement('td');
                nameCell.textContent = member.playername;
                nameCell.style.padding = '0.75rem 1rem';
                if (index === 0) nameCell.style.fontSize = '1.1rem';
                row.appendChild(nameCell);

                // Score
                const scoreCell = document.createElement('td');
                scoreCell.textContent = member.score.toLocaleString();
                scoreCell.style.padding = '0.75rem 1rem';
                scoreCell.style.textAlign = 'center';
                scoreCell.style.fontWeight = '600';
                scoreCell.style.color = 'var(--color-coral)';
                row.appendChild(scoreCell);

                // Attacks
                const attacksCell = document.createElement('td');
                attacksCell.textContent = member.attacks !== null && member.attacks !== undefined ? member.attacks.toLocaleString() : 'N/A';
                attacksCell.style.padding = '0.75rem 1rem';
                attacksCell.style.textAlign = 'center';
                attacksCell.style.color = '#666';
                row.appendChild(attacksCell);

                // Level
                const levelCell = document.createElement('td');
                levelCell.textContent = member.level || 0;
                levelCell.style.padding = '0.75rem 1rem';
                levelCell.style.textAlign = 'center';
                levelCell.style.color = '#666';
                row.appendChild(levelCell);

                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            teamSection.appendChild(table);

            this.containerEl.appendChild(teamSection);
        });
    }

    updateStatus(message) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
    }
}

