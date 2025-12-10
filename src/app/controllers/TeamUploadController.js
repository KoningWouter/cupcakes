export default class TeamUploadController {
    constructor({ teamStatus, teamMembersGrid, deleteStatus }) {
        this.teamStatus = teamStatus;
        this.teamMembersGrid = teamMembersGrid;
        this.deleteStatus = deleteStatus;
    }

    updateTeamStatus(message) {
        if (!this.teamStatus) return;
        this.teamStatus.textContent = message;
    }

    updateDeleteStatus(message) {
        if (!this.deleteStatus) return;
        this.deleteStatus.textContent = message;
    }

    async uploadTeamMembers() {
        if (!window.firebaseDb) {
            this.updateTeamStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }

        const uploadButton = document.getElementById('uploadTeamButton');
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.textContent = 'Uploading...';
        }

        const teamSelect = document.getElementById('teamSelect');
        const selectedTeam = teamSelect ? teamSelect.value : '';
        if (!selectedTeam) {
            this.updateTeamStatus('Please select a team first.');
            this.resetUploadButton(uploadButton);
            return;
        }

        const fileInput = document.getElementById('teamMembersFileInput');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            this.updateTeamStatus('Please select a JSON file first.');
            this.resetUploadButton(uploadButton);
            return;
        }

        const file = fileInput.files[0];
        if (!file.name.endsWith('.json')) {
            this.updateTeamStatus('Please select a valid JSON file.');
            this.resetUploadButton(uploadButton);
            return;
        }

        this.updateTeamStatus('Loading team members JSON file...');

        try {
            const fileText = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });

            const teamMembers = JSON.parse(fileText);
            if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
                throw new Error('Team members data is empty or invalid');
            }

            this.updateTeamStatus(`Uploading ${teamMembers.length} team members to Firebase...`);
            const { doc, setDoc } = window.firebaseFirestore;
            if (!doc || !setDoc) {
                throw new Error('Firestore functions not available');
            }

            let uploaded = 0;
            let errors = 0;
            const batchSize = 50;
            for (let i = 0; i < teamMembers.length; i += batchSize) {
                const batch = teamMembers.slice(i, i + batchSize);
                await Promise.all(batch.map(async (member) => {
                    try {
                        const memberDoc = doc(window.firebaseDb, 'teamMembers', member.userID.toString());
                        await setDoc(memberDoc, {
                            userID: member.userID,
                            playername: member.playername || '',
                            honorID: member.honorID || null,
                            honorStyle: member.honorStyle || 'default',
                            level: member.level || 0,
                            attacks: member.attacks || 0,
                            status: member.status || [],
                            icons: member.icons || '',
                            attack_link: member.attack_link || '',
                            team: selectedTeam,
                            uploadedAt: new Date().toISOString()
                        });
                        uploaded++;
                    } catch (error) {
                        console.error(`Error uploading member ${member.userID}:`, error);
                        errors++;
                    }
                }));

                this.updateTeamStatus(`Uploading... ${uploaded}/${teamMembers.length} members uploaded`);
            }

            this.updateTeamStatus(`Successfully uploaded ${uploaded} team members${errors > 0 ? ` (${errors} errors)` : ''}!`);
        } catch (error) {
            console.error('Error uploading team members:', error);
            this.updateTeamStatus(`Error: ${error.message}`);
        } finally {
            this.resetUploadButton(uploadButton);
        }
    }

    async loadTeamMembers() {
        if (!window.firebaseDb) {
            this.updateTeamStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }

        this.updateTeamStatus('Loading team members from Firebase...');
        if (this.teamMembersGrid) {
            this.teamMembersGrid.innerHTML = '';
        }

        try {
            const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
            if (!collection || !getDocs || !query || !orderBy) {
                throw new Error('Firestore functions not available');
            }

            const teamMembersRef = collection(window.firebaseDb, 'teamMembers');
            const q = query(teamMembersRef, orderBy('level', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                this.updateTeamStatus('No team members found in Firebase. Click "Upload Team Members to Firebase" to upload them.');
                return;
            }

            const members = [];
            querySnapshot.forEach((docSnapshot) => members.push(docSnapshot.data()));
            this.renderTeamMembers(members);
            this.updateTeamStatus(`Loaded ${members.length} team members from Firebase.`);
        } catch (error) {
            console.error('Error loading team members:', error);
            this.updateTeamStatus(`Error: ${error.message}`);
        }
    }

    renderTeamMembers(members) {
        if (!this.teamMembersGrid) return;
        this.teamMembersGrid.innerHTML = '';

        members.forEach(member => {
            const item = document.createElement('div');
            item.className = 'competition-item';

            const title = document.createElement('h4');
            title.textContent = member.playername || `User ${member.userID}`;
            item.appendChild(title);

            const levelP = document.createElement('p');
            levelP.innerHTML = `<strong>Level:</strong> ${member.level || 0}`;
            item.appendChild(levelP);

            if (member.status && Array.isArray(member.status) && member.status.length > 0) {
                const statusP = document.createElement('p');
                const statusColor = member.status[0] || 'unknown';
                const statusText = member.status[1] || member.status[0] || 'Unknown';
                statusP.innerHTML = `<strong>Status:</strong> <span style="color: ${statusColor}">${statusText}</span>`;
                item.appendChild(statusP);
            }

            if (member.attacks !== undefined) {
                const attacksP = document.createElement('p');
                attacksP.innerHTML = `<strong>Attacks:</strong> ${member.attacks}`;
                item.appendChild(attacksP);
            }

            if (member.honorID) {
                const honorP = document.createElement('p');
                honorP.innerHTML = `<strong>Honor ID:</strong> ${member.honorID}`;
                item.appendChild(honorP);
            }

            if (member.team) {
                const teamP = document.createElement('p');
                teamP.innerHTML = `<strong>Team:</strong> ${member.team}`;
                teamP.style.color = 'var(--color-coral)';
                teamP.style.fontWeight = '600';
                item.appendChild(teamP);
            }

            const idP = document.createElement('p');
            idP.innerHTML = `<strong>User ID:</strong> ${member.userID}`;
            idP.style.fontSize = '0.9rem';
            idP.style.color = '#777';
            item.appendChild(idP);

            this.teamMembersGrid.appendChild(item);
        });
    }

    async deleteAllDatabaseData() {
        if (!window.firebaseDb) {
            this.updateDeleteStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }

        const confirm1 = confirm('⚠️ WARNING: This will permanently delete ALL team members from the database.\n\nThis action cannot be undone!\n\nAre you sure you want to continue?');
        if (!confirm1) {
            this.updateDeleteStatus('Delete operation cancelled.');
            return;
        }

        const confirm2 = confirm('⚠️ FINAL CONFIRMATION:\n\nAre you absolutely sure you want to delete ALL database data?\n\nClick OK to proceed or Cancel to abort.');
        if (!confirm2) {
            this.updateDeleteStatus('Delete operation cancelled.');
            return;
        }

        const deleteButton = document.getElementById('deleteAllDataButton');
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.textContent = 'Deleting...';
        }

        this.updateDeleteStatus('Deleting all team members from Firebase...');

        try {
            const { collection, getDocs, doc, deleteDoc } = window.firebaseFirestore;
            if (!collection || !getDocs || !doc || !deleteDoc) {
                throw new Error('Firestore functions not available');
            }

            const teamMembersRef = collection(window.firebaseDb, 'teamMembers');
            const querySnapshot = await getDocs(teamMembersRef);

            if (querySnapshot.empty) {
                this.updateDeleteStatus('No data found in database.');
                this.resetDeleteButton(deleteButton);
                return;
            }

            let deleted = 0;
            let errors = 0;

            const batchSize = 50;
            const docs = [];
            querySnapshot.forEach((docSnapshot) => docs.push(docSnapshot));

            for (let i = 0; i < docs.length; i += batchSize) {
                const batch = docs.slice(i, i + batchSize);
                await Promise.all(batch.map(async (docSnapshot) => {
                    try {
                        const memberDoc = doc(window.firebaseDb, 'teamMembers', docSnapshot.id);
                        await deleteDoc(memberDoc);
                        deleted++;
                    } catch (error) {
                        console.error(`Error deleting member ${docSnapshot.id}:`, error);
                        errors++;
                    }
                }));

                this.updateDeleteStatus(`Deleting... ${deleted}/${docs.length} members deleted`);
            }

            this.updateDeleteStatus(`Successfully deleted ${deleted} team members${errors > 0 ? ` (${errors} errors)` : ''}!`);

            if (this.teamMembersGrid) this.teamMembersGrid.innerHTML = '';
        } catch (error) {
            console.error('Error deleting database data:', error);
            this.updateDeleteStatus(`Error: ${error.message}`);
        } finally {
            this.resetDeleteButton(deleteButton);
        }
    }

    resetUploadButton(uploadButton) {
        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.textContent = 'Upload Team Members to Firebase';
        }
    }

    resetDeleteButton(deleteButton) {
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.textContent = 'Delete All Database Data';
        }
    }
}

