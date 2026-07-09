using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Invoices;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

/// <summary>
/// All staff can view invoices; only Admin and Receptionist can create
/// invoices, record payments, or update invoice details. Doctors are
/// view-only.
/// </summary>
[ApiController]
[Authorize(Policy = "StaffOnly")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public InvoicesController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    [HttpGet("api/invoices")]
    public async Task<ActionResult<ApiResponse<PaginatedResponse<InvoiceListItemDto>>>> GetAll([FromQuery] InvoiceQueryDto query)
    {
        var (result, error) = await _invoiceService.GetInvoicesAsync(query);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<PaginatedResponse<InvoiceListItemDto>>.Ok(result!));
    }

    [HttpGet("api/invoices/stats")]
    public async Task<ActionResult<ApiResponse<InvoiceStatsDto>>> GetStats()
    {
        var stats = await _invoiceService.GetInvoiceStatsAsync();
        return Ok(ApiResponse<InvoiceStatsDto>.Ok(stats));
    }

    [HttpGet("api/invoices/{id:guid}")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetById(Guid id)
    {
        var invoice = await _invoiceService.GetInvoiceByIdAsync(id);
        if (invoice is null)
        {
            return NotFound(new ErrorResponse { Message = "Invoice not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<InvoiceDto>.Ok(invoice));
    }

    [HttpGet("api/patients/{patientId:guid}/invoices")]
    public async Task<ActionResult<ApiResponse<List<InvoiceListItemDto>>>> GetForPatient(Guid patientId)
    {
        var invoices = await _invoiceService.GetPatientInvoicesAsync(patientId);
        return Ok(ApiResponse<List<InvoiceListItemDto>>.Ok(invoices));
    }

    [HttpGet("api/appointments/{appointmentId:guid}/invoice")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetByAppointmentId(Guid appointmentId)
    {
        var invoice = await _invoiceService.GetInvoiceByAppointmentIdAsync(appointmentId);
        if (invoice is null)
        {
            return NotFound(new ErrorResponse { Message = "No invoice exists for this appointment.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<InvoiceDto>.Ok(invoice));
    }

    [HttpGet("api/visits/{visitId:guid}/invoice")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetByVisitId(Guid visitId)
    {
        var invoice = await _invoiceService.GetInvoiceByVisitIdAsync(visitId);
        if (invoice is null)
        {
            return NotFound(new ErrorResponse { Message = "No invoice exists for this visit.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<InvoiceDto>.Ok(invoice));
    }

    [HttpPost("api/invoices")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> Create([FromBody] CreateInvoiceDto request)
    {
        var (invoice, error) = await _invoiceService.CreateInvoiceAsync(request);
        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<InvoiceDto>.Ok(invoice!, "Invoice created"));
    }

    [HttpPut("api/invoices/{id:guid}")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> Update(Guid id, [FromBody] UpdateInvoiceDto request)
    {
        var (invoice, error, notFound) = await _invoiceService.UpdateInvoiceAsync(id, request);
        if (notFound)
        {
            return NotFound(new ErrorResponse { Message = "Invoice not found.", TraceId = HttpContext.TraceIdentifier });
        }

        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<InvoiceDto>.Ok(invoice!, "Invoice updated"));
    }

    [HttpPost("api/invoices/{id:guid}/payments")]
    [Authorize(Policy = "AdminOrReceptionist")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> AddPayment(Guid id, [FromBody] AddPaymentDto request)
    {
        var createdByUserId = ResolveCurrentUserId();

        var (invoice, error, notFound) = await _invoiceService.AddPaymentAsync(id, request, createdByUserId);
        if (notFound)
        {
            return NotFound(new ErrorResponse { Message = "Invoice not found.", TraceId = HttpContext.TraceIdentifier });
        }

        if (error is not null)
        {
            return BadRequest(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<InvoiceDto>.Ok(invoice!, "Payment recorded"));
    }

    private Guid? ResolveCurrentUserId()
    {
        var appUserIdClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(appUserIdClaim, out var appUserId) ? appUserId : null;
    }
}
