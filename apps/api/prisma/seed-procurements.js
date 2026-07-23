"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminRole, admin, depts, vendors, appTypes, stagesDef, i, stage, status_1, createdAt, referenceNo, p, j, s, stageName, isCurrent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Seeding procurement data...');
                    return [4 /*yield*/, prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } })];
                case 1:
                    adminRole = _a.sent();
                    return [4 /*yield*/, prisma.user.findFirst({ where: { userRoles: { some: { roleId: adminRole === null || adminRole === void 0 ? void 0 : adminRole.id } } } })];
                case 2:
                    admin = _a.sent();
                    if (!!admin) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma.user.findFirst()];
                case 3:
                    admin = _a.sent();
                    _a.label = 4;
                case 4:
                    if (!admin) {
                        console.log('No user found to assign as creator.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, prisma.department.findMany()];
                case 5:
                    depts = _a.sent();
                    return [4 /*yield*/, prisma.vendor.findMany()];
                case 6:
                    vendors = _a.sent();
                    appTypes = ['Capex', 'Opex', 'Raw Material', 'Consumables', 'Services'];
                    stagesDef = [
                        'Indent Creation', 'Indent Verification', 'Store Check', 'RFQ Float',
                        'Techno-Comm Eval', 'Negotiation', 'Purchase Orders', 'PO Approval L1',
                        'PO Approval L2', 'Vendor Acceptance', 'Vendor Follow-Up', 'Material Receipt',
                        'Material Inspection', 'Secondary Inspection', 'Final Inspection', 'Debit Note',
                        'Bill to Accounts', 'Bill to Purchase', 'Bill Creation', 'Tally Entry',
                        'Bill Approval L1', 'Bill Approval L2', 'Payment Advice'
                    ];
                    i = 1;
                    _a.label = 7;
                case 7:
                    if (!(i <= 12)) return [3 /*break*/, 18];
                    stage = Math.floor(Math.random() * 23) + 1;
                    status_1 = 'IN_PROGRESS';
                    if (stage === 23)
                        status_1 = 'COMPLETED';
                    if (Math.random() < 0.1)
                        status_1 = 'HOLD';
                    if (Math.random() < 0.05)
                        status_1 = 'REJECTED';
                    createdAt = new Date();
                    createdAt.setDate(createdAt.getDate() - (30 - i)); // spread over last 30 days
                    referenceNo = "PR-".concat(new Date().getFullYear(), "-").concat(Math.random().toString(36).substring(2, 7).toUpperCase(), "-").concat(i);
                    return [4 /*yield*/, prisma.procurement.create({
                            data: {
                                referenceNo: referenceNo,
                                title: "Procurement of Industrial Materials Batch ".concat(i),
                                description: "This is a simulated procurement request for Batch ".concat(i, " required for general operations."),
                                application: appTypes[i % appTypes.length],
                                itemType: 'Mechanical',
                                priority: i % 3 === 0 ? 'HIGH' : 'NORMAL',
                                requestedById: admin.id,
                                assignedToId: admin.id,
                                currentStage: stage,
                                status: status_1,
                                departmentId: depts.length > 0 ? depts[i % depts.length].id : null,
                                vendorId: vendors.length > 0 ? vendors[i % vendors.length].id : null,
                                vendorName: vendors.length > 0 ? vendors[i % vendors.length].vendorName : null,
                                createdAt: createdAt,
                                updatedAt: new Date()
                            }
                        })];
                case 8:
                    p = _a.sent();
                    j = 1;
                    _a.label = 9;
                case 9:
                    if (!(j <= 3)) return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.procurementItem.create({
                            data: {
                                procurementId: p.id,
                                itemCode: "ITM-".concat(j, "00").concat(i),
                                itemName: "Industrial Component ".concat(j, " - Type ").concat(i),
                                quantity: 10 + j * 5
                            }
                        })];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11:
                    j++;
                    return [3 /*break*/, 9];
                case 12:
                    s = 1;
                    _a.label = 13;
                case 13:
                    if (!(s <= stage)) return [3 /*break*/, 17];
                    stageName = stagesDef[s - 1] || "Stage ".concat(s);
                    isCurrent = s === stage;
                    return [4 /*yield*/, prisma.procurementStage.create({
                            data: {
                                procurementId: p.id,
                                stageNumber: s,
                                stageName: stageName,
                                status: isCurrent && (status_1 === 'IN_PROGRESS' || status_1 === 'HOLD') ? 'PENDING' : 'APPROVED',
                                startedAt: createdAt,
                                completedAt: isCurrent ? null : new Date(createdAt.getTime() + 1000 * 60 * 60 * s),
                                assignedToId: admin.id
                            }
                        })];
                case 14:
                    _a.sent();
                    if (!!isCurrent) return [3 /*break*/, 16];
                    return [4 /*yield*/, prisma.procurementHistory.create({
                            data: {
                                procurementId: p.id,
                                stageNumber: s,
                                action: 'APPROVED',
                                description: "".concat(stageName, " approved by System Admin"),
                                performedById: admin.id,
                                createdAt: new Date(createdAt.getTime() + 1000 * 60 * 60 * s)
                            }
                        })];
                case 15:
                    _a.sent();
                    _a.label = 16;
                case 16:
                    s++;
                    return [3 /*break*/, 13];
                case 17:
                    i++;
                    return [3 /*break*/, 7];
                case 18:
                    console.log('Seeded 30 realistic procurement records successfully!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
