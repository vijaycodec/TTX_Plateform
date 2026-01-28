const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed data - DIRECT APPROACH
const seedDatabase = async () => {
  const connection = await connectDB();
  
  try {
    console.log('Clearing existing data...');
    await connection.db.collection('users').deleteMany({});
    await connection.db.collection('exercises').deleteMany({});
    await connection.db.collection('participants').deleteMany({});
    console.log('Database cleared');

    // Hash password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create user directly in collection (bypass model)
    const user = {
      username: 'Vijay Pratap',
      email: 'facilitator@codec.com',
      password: hashedPassword,
      role: 'facilitator',
      createdAt: new Date()
    };

    const userResult = await connection.db.collection('users').insertOne(user);
    console.log('✓ Facilitator user created');

    // Create comprehensive OT security exercise with multiple injects
    const exercise = {
      title: 'OT Network Security Breach Simulation',
      description: 'A realistic tabletop exercise simulating a cyber attack on an Operational Technology (OT) network - Distribution Control Centre.',
      facilitator: userResult.insertedId,
      accessCode: 'OTEX2024',
      status: 'active',
      maxParticipants: 20,
      settings: {
        scoringEnabled: true,
        autoRelease: false,
        showScores: true
      },
      injects: [
        {
          injectNumber: 1,
          title: 'Suspicious IT-Originated Access to OT Environment',
          narrative: `It is a regular working day at 0910 AM, and operations at the Distribution Control Centre are running normally.

The IT SOC detects unusual authentication activity involving a privileged Active Directory account that is occasionally used for infrastructure administration and limited OT support activities.

The login occurs outside approved maintenance windows and originates from an unexpected IT workstation. Shortly after successful authentication, firewall logs indicate that the same account initiates connections toward OT systems, including the SCADA Application Server.

The OT Control Room confirms that:
• No SCADA maintenance is planned
• No IT support was requested
• Grid operations remain stable

While no alarms or outages are observed, this activity represents an unauthorized attempt to access the OT environment using legitimate credentials.`,
          artifacts: [
            {
              name: 'Active Directory Security Log',
              type: 'log',
              content: `Timestamp: 2025-12-03T09:02:18
Account Name: it_admin_ops
Logon Type: Interactive
Source Workstation: ITWS114
Source IP: 10.10.34.22
Logon Status: Success
Privileges: Domain Admin, OT_Support`,
              metadata: {
                timestamp: '2025-12-03T09:02:18',
                source: 'AD-DC01 Security Logs',
                severity: 'High',
                eventId: '4624'
              },
              order: 1
            },
            {
              name: 'Firewall Log',
              type: 'log',
              content: `Timestamp: 2025-12-03T09:06:42
Source Network: IT-Subnet (10.10.34.0/24)
Source IP: 10.10.34.22
Destination Host: SCADA-APP-01 (10.20.11.10)
Protocol: RDP (TCP/3389), SMB (TCP/445)
Action: Allowed
Rule: IT_to_OT_Management`,
              metadata: {
                timestamp: '2025-12-03T09:06:42',
                source: 'OT Firewall - FW-OT-01',
                severity: 'High'
              },
              order: 2
            }
          ],
          phases: [
            {
              phaseNumber: 1,
              phaseName: 'Triage',
              question: 'How would you triage this event?',
              questionType: 'single',
              options: [
                { id: 'A', text: 'P4 - Informational: Classify as routine administrative activity and continue monitoring', points: 0, magnitude: 'least_effective' },
                { id: 'B', text: 'P3 - Low Severity: Treat as a procedural deviation and seek clarification from IT administrators', points: 2, magnitude: 'somewhat_effective' },
                { id: 'C', text: 'P2 - Medium Severity: Classify as suspicious identity misuse involving OT access and initiate investigation', points: 10, magnitude: 'most_effective' },
                { id: 'D', text: 'P1 - High Severity: Classify as a high-severity incident due to unauthorized IT access into OT systems', points: 8, magnitude: 'effective' },
                { id: 'E', text: 'P0 - Critical: Declare a critical incident due to potential compromise of privileged credentials with access to SCADA', points: 5, magnitude: 'not_effective' }
              ],
              correctAnswer: ['C'],
              maxPoints: 10,
              order: 1
            },
            {
              phaseNumber: 2,
              phaseName: 'Detection & Investigation',
              question: 'What would you do to investigate further at this stage? (Select all that apply)',
              questionType: 'multiple',
              options: [
                { id: 'A', text: 'Review detailed Active Directory logs to reconstruct the full activity timeline', points: 3, magnitude: 'somewhat_effective' },
                { id: 'B', text: 'Correlate firewall and network logs to identify which OT assets were accessed', points: 3, magnitude: 'somewhat_effective' },
                { id: 'C', text: 'Validate whether any configuration or data changes occurred on SCADA servers', points: 2, magnitude: 'somewhat_effective' },
                { id: 'D', text: 'Check for similar activity involving other privileged accounts', points: 2, magnitude: 'somewhat_effective' },
                { id: 'E', text: 'Delay investigation until an operational impact is observed', points: 0, magnitude: 'least_effective' }
              ],
              correctAnswer: ['A', 'B', 'C', 'D'],
              maxPoints: 10,
              order: 2
            },
            {
              phaseNumber: 3,
              phaseName: 'Initial Response',
              question: 'What immediate actions should be taken?',
              questionType: 'single',
              options: [
                { id: 'A', text: 'Immediately disable the it_admin_ops account', points: 10, magnitude: 'most_effective' },
                { id: 'B', text: 'Continue monitoring without taking action', points: 0, magnitude: 'least_effective' },
                { id: 'C', text: 'Call the IT department to verify the activity', points: 5, magnitude: 'not_effective' },
                { id: 'D', text: 'Shut down all OT systems as a precaution', points: 2, magnitude: 'somewhat_effective' }
              ],
              correctAnswer: ['A'],
              maxPoints: 10,
              order: 3
            }
          ],
          isActive: false,
          responsesOpen: false,
          order: 1
        },
        {
          injectNumber: 2,
          title: 'Lateral Movement & Privilege Escalation',
          narrative: `It's now 11:30 AM. Since the initial alert about unauthorized access through 'j.smith', more suspicious activities have unfolded within your network. You notice multiple logon events on systems where 'j.smith' has not typically authenticated, including a specific server hosting critical internal applications. These logons occur within a short span and are accompanied by unusual PowerShell executions.

Concurrently, there are new entries in the event logs indicating a privilege escalation attempt, as a newly elevated admin account, 'tempadmin', is observed initiating several account creations. The network IDS flags lateral movement from 'j.smith's initial login machine to various other departments, hinting at credential utilization across your environment.

This activity needs immediate attention to understand and mitigate potential adversarial maneuvers internally.`,
          artifacts: [
            {
              name: 'Successful Logon Event',
              type: 'log',
              content: `Event ID: 4624 (An account was successfully logged on)
Time: 2023-10-16 11:15:42
Account: tempadmin
Source IP: 192.0.2.154
Target: appserver.internal.domain.com
Logon Type: 3 (Network)
Workstation Name: ws-desktop93`,
              metadata: {
                timestamp: '2023-10-16T11:15:42',
                source: 'appserver.internal.domain.com Security Logs',
                severity: 'High',
                eventId: '4624'
              },
              order: 1
            },
            {
              name: 'PowerShell Script Execution',
              type: 'log',
              content: `Event ID: 4104 (Script Block Logging)
Time: 2023-10-16 11:18:10
User: j.smith
Computer: ws-desktop93.internal.domain.com
Command: New-LocalUser -Name tempadmin -Password (ConvertTo-SecureString "P@ssw0rd123!" -AsPlainText -Force) -FullName "Temporary Administrator" -Description "Temp admin account"
ScriptBlock ID: a7b3c4d5-e6f7-8901-2345-6789abcdef01`,
              metadata: {
                timestamp: '2023-10-16T11:18:10',
                source: 'PowerShell Operational Logs',
                severity: 'Critical',
                eventId: '4104'
              },
              order: 2
            },
            {
              name: 'Network IDS Alert - Lateral Movement',
              type: 'alert',
              content: `Alert Type: Lateral Movement Detected
Time: 2023-10-16 11:20:22
Source: ws-desktop93.internal.domain.com (192.168.10.93)
Destination: finance-svr01.internal.domain.com (192.168.20.45)
Protocol: SMB (Port 445)
User Context: j.smith
Severity: High
Description: Unusual lateral movement detected from workstation to finance server. User 'j.smith' has no historical access to finance department systems.`,
              metadata: {
                timestamp: '2023-10-16T11:20:22',
                source: 'Network IDS - Sensor 04',
                severity: 'High',
                alertId: 'LM-2023-10-16-0047'
              },
              order: 3
            },
            {
              name: 'Special Privileges Assigned',
              type: 'log',
              content: `Event ID: 4672 (Special privileges assigned to new logon)
Time: 2023-10-16 11:22:58
Account Name: tempadmin
Account Domain: INTERNAL
Logon ID: 0x3E7A4B2
Privileges Assigned:
  - SeDebugPrivilege (Debug programs)
  - SeImpersonatePrivilege (Impersonate a client after authentication)
  - SeAssignPrimaryTokenPrivilege (Replace a process level token)
  - SeTcbPrivilege (Act as part of the operating system)
  - SeBackupPrivilege (Back up files and directories)
  - SeRestorePrivilege (Restore files and directories)
  - SeLoadDriverPrivilege (Load and unload device drivers)`,
              metadata: {
                timestamp: '2023-10-16T11:22:58',
                source: 'appserver.internal.domain.com Security Logs',
                severity: 'Critical',
                eventId: '4672'
              },
              order: 4
            }
          ],
          phases: [
            {
              phaseNumber: 1,
              phaseName: 'Initial Assessment',
              question: 'Based on the artifacts provided, what is the PRIMARY security concern at this stage?',
              questionType: 'single',
              options: [
                { id: 'A', text: 'Normal administrative activity', points: 0, magnitude: 'least_effective' },
                { id: 'B', text: 'Potential lateral movement and privilege escalation by a compromised account', points: 10, magnitude: 'most_effective' },
                { id: 'C', text: 'Network connectivity issues', points: 0, magnitude: 'least_effective' },
                { id: 'D', text: 'PowerShell configuration error', points: 2, magnitude: 'somewhat_effective' }
              ],
              correctAnswer: ['B'],
              maxPoints: 10,
              order: 1
            },
            {
              phaseNumber: 2,
              phaseName: 'Threat Identification',
              question: 'Which of the following indicators suggest malicious activity? (Select all that apply)',
              questionType: 'multiple',
              options: [
                { id: 'A', text: 'Creation of a new local admin account (tempadmin) via PowerShell', points: 3, magnitude: 'somewhat_effective' },
                { id: 'B', text: 'Logon to systems where j.smith has no historical access', points: 3, magnitude: 'somewhat_effective' },
                { id: 'C', text: 'Assignment of sensitive privileges (SeDebugPrivilege, SeImpersonatePrivilege)', points: 3, magnitude: 'somewhat_effective' },
                { id: 'D', text: 'Network logon from 192.0.2.154', points: 1, magnitude: 'least_effective' },
                { id: 'E', text: 'All of the above', points: 0, magnitude: 'least_effective' }
              ],
              correctAnswer: ['A', 'B', 'C'],
              maxPoints: 10,
              order: 2
            },
            {
              phaseNumber: 3,
              phaseName: 'Immediate Response',
              question: 'What should be your IMMEDIATE containment action?',
              questionType: 'single',
              options: [
                { id: 'A', text: 'Wait and monitor for additional activity', points: 0, magnitude: 'least_effective' },
                { id: 'B', text: 'Disable both j.smith and tempadmin accounts immediately', points: 10, magnitude: 'most_effective' },
                { id: 'C', text: 'Reset j.smith password only', points: 5, magnitude: 'not_effective' },
                { id: 'D', text: 'Send an email to j.smith asking about the activity', points: 0, magnitude: 'least_effective' },
                { id: 'E', text: 'Reboot the affected servers', points: 2, magnitude: 'somewhat_effective' }
              ],
              correctAnswer: ['B'],
              maxPoints: 10,
              order: 3
            },
            {
              phaseNumber: 4,
              phaseName: 'Investigation',
              question: 'Which systems require immediate forensic investigation? (Select all that apply)',
              questionType: 'multiple',
              options: [
                { id: 'A', text: 'ws-desktop93.internal.domain.com (initial compromise point)', points: 3, magnitude: 'somewhat_effective' },
                { id: 'B', text: 'appserver.internal.domain.com (privilege escalation target)', points: 3, magnitude: 'somewhat_effective' },
                { id: 'C', text: 'finance-svr01.internal.domain.com (lateral movement target)', points: 3, magnitude: 'somewhat_effective' },
                { id: 'D', text: 'All Active Directory domain controllers', points: 1, magnitude: 'least_effective' }
              ],
              correctAnswer: ['A', 'B', 'C'],
              maxPoints: 10,
              order: 4
            }
          ],
          isActive: false,
          responsesOpen: false,
          order: 2
        },
        {
          injectNumber: 3,
          title: 'Field Device Manipulation & Persistence',
          narrative: `At 1015 AM, OT engineers begin observing abnormal activity at the field device layer.

An RTU at Substation SS-027 is accessed in an engineering-level configuration state, an activity normally performed only by authorized field engineers during planned maintenance.

Within minutes, similar activity is detected on an FRTU at Substation SS-045. Network monitoring shows that the activity originates from an engineering HMI workstation ENG-HMI-02.

OT confirms that:
• No engineer is logged into ENG-HMI-02
• No field teams are deployed at SS-027 or SS-045
• No maintenance is scheduled

This indicates lateral movement within the OT network, with direct interaction attempts against RTUs and FRTUs that influence feeder operations.`,
          artifacts: [
            {
              name: 'RTU Audit Log - RTU-SS027',
              type: 'log',
              content: `Timestamp: 2025-12-03T10:07:14
Event: Engineering-Level Access Initiated
Source Host: ENG-HMI-02 (10.20.11.56)
User Account: rtu_config
Access Method: Remote
Protocol: Telnet
Command Executed: SET_CONFIG MODE=ENGINEERING`,
              metadata: {
                timestamp: '2025-12-03T10:07:14',
                source: 'RTU-SS027 System Logs',
                severity: 'Critical',
                eventId: 'RTU-3401'
              },
              order: 1
            },
            {
              name: 'IDS Alert - Unauthorized OT Command Pattern',
              type: 'alert',
              content: `Alert Type: Unauthorized OT Command Pattern
Timestamp: 2025-12-03T10:08:22
Protocol: IEC 60870-5-104
Source: ENG-HMI-02 (10.20.11.56)
Destination: RTU-SS027 (10.20.50.27)
Severity: High
Description: Detected unusual IEC-104 command sequence consistent with RTU reconfiguration attempt. Commands deviate from normal operational patterns.`,
              metadata: {
                timestamp: '2025-12-03T10:08:22',
                source: 'OT-IDS - Sensor 03',
                severity: 'Critical',
                alertId: 'OT-IDS-2025-12-03-0089'
              },
              order: 2
            },
            {
              name: 'OT Firewall Log',
              type: 'log',
              content: `Timestamp: 2025-12-03T10:10:05
Source: ENG-HMI-02 (10.20.11.56)
Destination: FRTU-SS045 (10.20.50.45)
Port: 502 (MODBUS/TCP)
Protocol: MODBUS
Action: Allowed
Connection State: Established
Data Transfer: 4.2 KB`,
              metadata: {
                timestamp: '2025-12-03T10:10:05',
                source: 'OT Firewall - FW-OT-01',
                severity: 'High'
              },
              order: 3
            }
          ],
          phases: [
            {
              phaseNumber: 1,
              phaseName: 'Containment & Eradication',
              question: 'How would you attempt to contain this threat?',
              questionType: 'single',
              options: [
                { id: 'A', text: 'Immediately disable the rtu_config account', points: 5, magnitude: 'not_effective' },
                { id: 'B', text: 'Isolate ENG-HMI-02 from the OT network', points: 10, magnitude: 'most_effective' },
                { id: 'C', text: 'Block RTU and FRTU access from all engineering workstations temporarily', points: 8, magnitude: 'effective' },
                { id: 'D', text: 'Continue monitoring to avoid operational disruption', points: 0, magnitude: 'least_effective' },
                { id: 'E', text: 'Shut down SCADA communications to prevent further interaction', points: 3, magnitude: 'somewhat_effective' }
              ],
              correctAnswer: ['B'],
              maxPoints: 10,
              order: 1
            },
            {
              phaseNumber: 2,
              phaseName: 'Recovery',
              question: 'What recovery actions would you consider at this stage? (Select all that apply)',
              questionType: 'multiple',
              options: [
                { id: 'A', text: 'Verify RTU and FRTU configurations against known-good baselines', points: 3, magnitude: 'somewhat_effective' },
                { id: 'B', text: 'Perform integrity checks on SCADA and engineering workstations', points: 3, magnitude: 'somewhat_effective' },
                { id: 'C', text: 'Require manual confirmation from field teams before restoring access', points: 2, magnitude: 'somewhat_effective' },
                { id: 'D', text: 'Restore affected devices from backups where available', points: 2, magnitude: 'somewhat_effective' },
                { id: 'E', text: 'Resume operations immediately once access is blocked', points: 0, magnitude: 'least_effective' }
              ],
              correctAnswer: ['A', 'B', 'C', 'D'],
              maxPoints: 10,
              order: 2
            },
            {
              phaseNumber: 3,
              phaseName: 'Escalation',
              question: 'What escalation actions would you take? (Select all that apply)',
              questionType: 'multiple',
              options: [
                { id: 'A', text: 'Notify OT leadership and control room management', points: 2, magnitude: 'somewhat_effective' },
                { id: 'B', text: 'Escalate to IT security leadership for coordinated response', points: 2, magnitude: 'somewhat_effective' },
                { id: 'C', text: 'Inform senior management due to operational risk', points: 3, magnitude: 'somewhat_effective' },
                { id: 'D', text: 'Prepare for regulatory notification if risk continues', points: 3, magnitude: 'somewhat_effective' },
                { id: 'E', text: 'Defer escalation until a customer impact occurs', points: 0, magnitude: 'least_effective' }
              ],
              correctAnswer: ['A', 'B', 'C', 'D'],
              maxPoints: 10,
              order: 3
            },
            {
              phaseNumber: 4,
              phaseName: 'Root Cause Analysis',
              question: 'What is the most likely attack vector used to compromise ENG-HMI-02?',
              questionType: 'single',
              options: [
                { id: 'A', text: 'Lateral movement from the initially compromised IT account (it_admin_ops)', points: 10, magnitude: 'most_effective' },
                { id: 'B', text: 'Direct external attack on ENG-HMI-02', points: 2, magnitude: 'somewhat_effective' },
                { id: 'C', text: 'Insider threat from a rogue engineer', points: 3, magnitude: 'somewhat_effective' },
                { id: 'D', text: 'Malware infection from USB device', points: 5, magnitude: 'not_effective' }
              ],
              correctAnswer: ['A'],
              maxPoints: 10,
              order: 4
            }
          ],
          isActive: false,
          responsesOpen: false,
          order: 3
        },
        {
          injectNumber: 4,
          title: 'Impact Assessment & Business Continuity',
          narrative: `At 1145 AM, after containing the threat, the incident response team conducts a comprehensive impact assessment.

Initial findings indicate:
• No actual operational disruption occurred
• RTU configurations were accessed but not modified
• The attacker appeared to be in reconnaissance phase
• Multiple privileged accounts were compromised
• Evidence of data exfiltration from SCADA historian

The organization must now determine the full extent of the breach, implement long-term security improvements, and meet regulatory reporting requirements.

Business leadership is requesting a clear understanding of:
• What data was accessed or stolen
• Whether customer operations were impacted
• What steps are being taken to prevent recurrence
• Whether regulatory notification is required`,
          artifacts: [
            {
              name: 'SCADA Historian Access Log',
              type: 'log',
              content: `Timestamp: 2025-12-03T09:15:30 - 09:45:18
User: it_admin_ops
Action: Bulk Export
Database: HistoricalData_2025
Records Exported: 487,523 records
Data Range: 2025-11-01 to 2025-12-03
Export Size: 2.4 GB
Destination: 10.10.34.22 (ITWS114)`,
              metadata: {
                timestamp: '2025-12-03T09:15:30',
                source: 'SCADA Historian Server',
                severity: 'Critical',
                eventId: 'HIST-5501'
              },
              order: 1
            },
            {
              name: 'Forensic Analysis Summary',
              type: 'document',
              content: `Incident Forensic Summary
Analysis Date: 2025-12-03
Analyst: SOC Team Lead

Compromised Assets:
- 1x Domain Admin account (it_admin_ops)
- 1x Engineering HMI workstation (ENG-HMI-02)
- 1x RTU configuration account (rtu_config)
- Access to 2x RTU devices, 1x FRTU device

Data Accessed:
- SCADA historian: 487K records (2.4 GB)
- Network topology diagrams
- OT device inventory
- Engineering credentials store

Operational Impact:
- No grid disruption
- No customer impact
- No safety incidents
- Reconnaissance-phase intrusion

Attacker Sophistication: HIGH
- Knowledge of OT protocols
- Understanding of ICS architecture
- Credential harvesting capability`,
              metadata: {
                timestamp: '2025-12-03T11:45:00',
                source: 'Incident Response Team',
                severity: 'High'
              },
              order: 2
            }
          ],
          phases: [
            {
              phaseNumber: 1,
              phaseName: 'Impact Classification',
              question: 'How would you classify the overall impact of this incident?',
              questionType: 'single',
              options: [
                { id: 'A', text: 'Low Impact: No operational disruption, limited data access', points: 2, magnitude: 'somewhat_effective' },
                { id: 'B', text: 'Medium Impact: Credential compromise and data exfiltration without operational impact', points: 10, magnitude: 'most_effective' },
                { id: 'C', text: 'High Impact: Significant compromise requiring major remediation', points: 5, magnitude: 'not_effective' },
                { id: 'D', text: 'Critical Impact: Operational disruption and safety implications', points: 0, magnitude: 'least_effective' }
              ],
              correctAnswer: ['B'],
              maxPoints: 10,
              order: 1
            },
            {
              phaseNumber: 2,
              phaseName: 'Regulatory Requirements',
              question: 'Which regulatory bodies should be notified? (Select all that apply)',
              questionType: 'multiple',
              options: [
                { id: 'A', text: 'National Grid Regulator (due to critical infrastructure impact)', points: 3, magnitude: 'somewhat_effective' },
                { id: 'B', text: 'Data Protection Authority (due to potential data breach)', points: 2, magnitude: 'somewhat_effective' },
                { id: 'C', text: 'Critical Infrastructure Protection Agency', points: 3, magnitude: 'somewhat_effective' },
                { id: 'D', text: 'Law Enforcement (due to suspected criminal activity)', points: 2, magnitude: 'somewhat_effective' },
                { id: 'E', text: 'No notification required as there was no customer impact', points: 0, magnitude: 'least_effective' }
              ],
              correctAnswer: ['A', 'B', 'C', 'D'],
              maxPoints: 10,
              order: 2
            },
            {
              phaseNumber: 3,
              phaseName: 'Long-term Security Improvements',
              question: 'What long-term security measures should be implemented? (Select all that apply)',
              questionType: 'multiple',
              options: [
                { id: 'A', text: 'Implement network segmentation between IT and OT environments', points: 2, magnitude: 'somewhat_effective' },
                { id: 'B', text: 'Deploy multi-factor authentication for all privileged accounts', points: 2, magnitude: 'somewhat_effective' },
                { id: 'C', text: 'Enhance monitoring and alerting for OT-specific protocols', points: 2, magnitude: 'somewhat_effective' },
                { id: 'D', text: 'Conduct regular OT security awareness training', points: 2, magnitude: 'somewhat_effective' },
                { id: 'E', text: 'Implement application whitelisting on OT assets', points: 2, magnitude: 'somewhat_effective' }
              ],
              correctAnswer: ['A', 'B', 'C', 'D', 'E'],
              maxPoints: 10,
              order: 3
            }
          ],
          isActive: false,
          responsesOpen: false,
          order: 4
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await connection.db.collection('exercises').insertOne(exercise);
    console.log('✓ Sample exercise created with access code: OTEX2024');

    // Create second exercise
    const exercise2 = {
      title: 'Phishing Response Exercise',
      description: 'Test your team\'s ability to detect and respond to phishing attacks.',
      facilitator: userResult.insertedId,
      accessCode: 'PHISH01',
      status: 'draft',
      maxParticipants: 15,
      settings: {
        scoringEnabled: true,
        autoRelease: true,
        showScores: false
      },
      injects: [
        {
          injectNumber: 1,
          title: 'Suspicious Email Detection',
          narrative: 'An employee receives a suspicious email...',
          artifacts: [],
          phases: [],
          isActive: false,
          responsesOpen: false,
          order: 1
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await connection.db.collection('exercises').insertOne(exercise2);
    console.log('✓ Second exercise created with access code: PHISH01');

    console.log('\n' + '='.repeat(50));
    console.log('✅ SEEDING COMPLETE!');
    console.log('='.repeat(50));
    console.log('\nTEST CREDENTIALS:');
    console.log('Facilitator: facilitator@codec.com');
    console.log('Password: password123');
    console.log('\nAccess Codes: OTEX2024, PHISH01');

    await connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    await connection.close();
    process.exit(1);
  }
};

seedDatabase();